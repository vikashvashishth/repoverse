const crypto = require('crypto');
const { inspectGithubRepository, inspectZipRepository } = require('../services/repositoryService');
const { saveScanIssues } = require('../services/errorHistoryService');
const { createScan } = require('../services/analysisCache');
const fs = require('fs/promises');
const RepositoryConnection = require('../models/RepositoryConnection');
const { normalizeRepoUrl, repoParts } = require('../utils/normalizeRepoUrl');
const { encryptSecret, decryptSecret } = require('../utils/webhookSecret');

const activeScans = new Set();

async function getOrCreateConnection(user, repoUrl) {
  const normalizedUrl = normalizeRepoUrl(repoUrl);
  const { owner, repo } = repoParts(normalizedUrl);
  return RepositoryConnection.findOneAndUpdate(
    { userId: user._id, repoUrl: normalizedUrl },
    { $setOnInsert: { userId: user._id, repoUrl: normalizedUrl, owner, repoName: repo } },
    { new: true, upsert: true, runValidators: true }
  );
}

async function runSuccessfulScan(user, connection, analysis) {
  const scanResult = await saveScanIssues(user._id, analysis.repository, analysis.issues);
  const { sourceContext, ...publicAnalysis } = analysis;
  const analysisId = createScan(user._id, publicAnalysis, sourceContext);
  await RepositoryConnection.updateOne(
    { _id: connection._id },
    {
      $set: {
        lastAnalyzedSha: publicAnalysis.repository.sha || connection.latestCommitSha,
        latestCommitSha: publicAnalysis.repository.sha || connection.latestCommitSha,
        latestCommitDate: publicAnalysis.repository.latestCommitDate || null,
        lastSuccessfulAnalysisAt: new Date(),
        syncStatus: 'Synced',
        lastError: '',
        newErrors: scanResult.newErrors,
        resolvedErrors: scanResult.resolvedErrors
      }
    }
  );
  return { analysisId, analysis: publicAnalysis, scanResult };
}

async function finishAnalysis(user, analysis, res) {
  const connection = await getOrCreateConnection(user, analysis.repository.url);
  const result = await runSuccessfulScan(user, connection, analysis);
  res.status(201).json({ analysisId: result.analysisId, analysis: result.analysis, connection: await publicConnection(connection._id) });
}

async function publicConnection(id) {
  return RepositoryConnection.findById(id).lean();
}

async function importGithub(req, res, next) {
  try {
    if (!req.body?.url) return res.status(400).json({ message: 'A GitHub repository URL is required.' });
    await finishAnalysis(req.user, await inspectGithubRepository(req.body.url), res);
  } catch (error) { next(error); }
}

async function importZip(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a .zip repository archive to upload.' });
    if (!req.body?.url) return res.status(400).json({ message: 'A GitHub repository URL is required to identify this ZIP scan.' });
    await finishAnalysis(req.user, await inspectZipRepository(req.file.path, req.file.originalname, req.body.url), res);
  } catch (error) { next(error); } finally {
    if (req.file?.path) await fs.rm(req.file.path, { force: true }).catch(() => {});
  }
}

async function listConnections(req, res, next) {
  try {
    const connections = await RepositoryConnection.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json({ repositories: connections.map(({ webhookSecretEncrypted, __v, ...item }) => item) });
  } catch (error) { next(error); }
}

async function configureWebhook(req, res, next) {
  try {
    if (!req.body?.url) return res.status(400).json({ message: 'A GitHub repository URL is required.' });
    if (!req.body?.secret || String(req.body.secret).length < 16) {
      return res.status(400).json({ message: 'Use a webhook secret of at least 16 characters.' });
    }
    const connection = await getOrCreateConnection(req.user, req.body.url);
    connection.webhookSecretEncrypted = encryptSecret(String(req.body.secret));
    connection.webhookConfigured = true;
    connection.webhookVerified = false;
    await connection.save();
    res.json({
      repository: await publicConnection(connection._id),
      webhook: {
        url: `${req.protocol}://${req.get('host')}/api/webhooks/github`,
        contentType: 'application/json',
        events: 'Just the push event',
        secretConfigured: true
      }
    });
  } catch (error) { next(error); }
}

async function syncRepository(req, res, next) {
  try {
    if (!req.body?.url) return res.status(400).json({ message: 'A GitHub repository URL is required.' });
    const repoUrl = normalizeRepoUrl(req.body.url);
    const connection = await RepositoryConnection.findOne({ userId: req.user._id, repoUrl });
    if (!connection) return res.status(404).json({ message: 'Import this repository before synchronizing it.' });
    if (activeScans.has(String(connection._id))) return res.status(202).json({ message: 'A scan is already in progress.', repository: await publicConnection(connection._id) });

    activeScans.add(String(connection._id));
    await RepositoryConnection.updateOne({ _id: connection._id }, { $set: { syncStatus: 'Analyzing', lastError: '' } });
    res.status(202).json({ message: 'Repository synchronization started.', repository: await publicConnection(connection._id) });

    setImmediate(async () => {
      try {
        const analysis = await inspectGithubRepository(repoUrl);
        await runSuccessfulScan(req.user, connection, analysis);
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
}

module.exports = { importGithub, importZip, listConnections, configureWebhook, syncRepository, activeScans, runSuccessfulScan, decryptSecret };
