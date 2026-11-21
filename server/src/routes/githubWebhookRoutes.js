const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const RepositoryConnection = require('../models/RepositoryConnection');
const User = require('../models/User');
const { normalizeRepoUrl } = require('../utils/normalizeRepoUrl');
const { decryptSecret } = require('../utils/webhookSecret');
const { inspectGithubRepository } = require('../services/repositoryService');
const { activeScans, runSuccessfulScan } = require('../controllers/repositoryController');

const webhookLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Webhook rate limit reached.' }
});

router.post('/', webhookLimit, async (req, res, next) => {
  try {
    if (req.get('x-github-event') !== 'push') return res.status(202).json({ ignored: true, reason: 'Only push events are processed.' });
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ message: 'Invalid GitHub payload.' });

    const ownerName = req.body.repository?.full_name;
    if (typeof ownerName !== 'string' || !ownerName.includes('/')) {
      return res.status(400).json({ message: 'Repository identity is missing from the payload.' });
    }
    const [owner, repo] = ownerName.split('/');
    let repoUrl;
    try { repoUrl = normalizeRepoUrl(`https://github.com/${owner}/${repo}`); } catch {
      return res.status(400).json({ message: 'Repository identity is invalid.' });
    }
    if (typeof req.body.repository?.html_url === 'string') {
      try {
        if (normalizeRepoUrl(req.body.repository.html_url) !== repoUrl) {
          return res.status(400).json({ message: 'Repository URL and owner/name do not match.' });
        }
      } catch {
        return res.status(400).json({ message: 'Repository URL is invalid.' });
      }
    }

    const connection = await RepositoryConnection.findOne({ repoUrl }).select('+webhookSecretEncrypted');
    if (!connection || !connection.webhookConfigured || !connection.webhookSecretEncrypted) {
      return res.status(404).json({ message: 'Repository webhook is not configured.' });
    }

    const signature = req.get('x-hub-signature-256');
    if (!/^sha256=[a-f0-9]{64}$/i.test(signature || '')) {
      return res.status(401).json({ message: 'Invalid GitHub signature.' });
    }
    let secret;
    try { secret = decryptSecret(connection.webhookSecretEncrypted); } catch {
      return res.status(500).json({ message: 'Webhook secret could not be read.' });
    }
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return res.status(401).json({ message: 'GitHub signature verification failed.' });
    }

    const commitSha = req.body.after || req.body.head_commit?.id;
    if (!/^[a-f0-9]{40}$/i.test(commitSha || '') || /^0{40}$/.test(commitSha)) {
      return res.status(400).json({ message: 'A valid commit SHA is missing from the push payload.' });
    }
    const deliveryId = req.get('x-github-delivery');
    if (!deliveryId) return res.status(400).json({ message: 'GitHub delivery ID is missing.' });
    if (connection.processedDeliveryIds.includes(deliveryId) || connection.lastAnalyzedSha === commitSha) {
      return res.status(202).json({ ignored: true, reason: 'Delivery or commit was already processed.' });
    }

    const commitDate = req.body.head_commit?.timestamp || null;
    await RepositoryConnection.updateOne(
      { _id: connection._id },
      {
        $set: {
          webhookVerified: true,
          latestCommitSha: commitSha,
          latestCommitDate: commitDate ? new Date(commitDate) : connection.latestCommitDate,
          syncStatus: connection.lastAnalyzedSha === commitSha ? 'Synced' : 'Update Available'
        },
        $push: { processedDeliveryIds: { $each: [deliveryId], $slice: -100 } }
      }
    );

    if (activeScans.has(String(connection._id))) {
      return res.status(202).json({ queued: true, duplicateProtection: true });
    }
    activeScans.add(String(connection._id));
    await RepositoryConnection.updateOne({ _id: connection._id }, { $set: { syncStatus: 'Analyzing', lastError: '' } });
    res.status(202).json({ queued: true });

    setImmediate(async () => {
      try {
        const user = await User.findById(connection.userId);
        if (!user) throw new Error('The repository account no longer exists.');
        const analysis = await inspectGithubRepository(repoUrl, commitSha);
        await runSuccessfulScan(user, connection, analysis);
      } catch (error) {
        await RepositoryConnection.updateOne(
          { _id: connection._id },
          { $set: { syncStatus: 'Analysis Failed', lastError: error.message || 'Repository analysis failed.' } }
        );
      } finally {
        activeScans.delete(String(connection._id));
      }
    });
  } catch (error) { next(error); }
});

module.exports = router;
