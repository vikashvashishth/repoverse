const ErrorHistory = require('../models/ErrorHistory');
const { generateErrorFingerprint } = require('./fingerprintService');

async function saveScanIssues(userId, repository, issues) {
  const now = new Date();
  const seenFingerprints = new Set();
  let newErrors = 0;
  await Promise.all(issues.map(async (issue) => {
    const data = {
      userId, repoName: repository.name, repoUrl: repository.url,
      errorType: issue.type, errorMessage: issue.message, fileName: issue.fileName || '',
      filePath: issue.filePath || '', lineNumber: issue.lineNumber ?? null,
      severity: issue.severity, suggestedFix: issue.suggestedFix || ''
    };
    data.fingerprint = generateErrorFingerprint(data);
    seenFingerprints.add(data.fingerprint);
    const existing = await ErrorHistory.findOne({ userId, fingerprint: data.fingerprint }).lean();
    if (!existing) newErrors += 1;
    const status = existing?.status === 'Ignored' ? 'Ignored' : 'Open';
    const update = { $set: { ...data, lastDetectedAt: now, status }, $setOnInsert: { firstDetectedAt: now }, $inc: { occurrenceCount: 1 } };
    try {
      await ErrorHistory.findOneAndUpdate({ userId, fingerprint: data.fingerprint }, update, { new: true, upsert: true, runValidators: true });
    } catch (error) {
      // Two identical findings in one scan can race on the unique index. The follow-up update preserves the intended single record.
      if (error?.code !== 11000) throw error;
      await ErrorHistory.findOneAndUpdate({ userId, fingerprint: data.fingerprint }, update, { new: true, runValidators: true });
    }
  }));
  const openRecords = await ErrorHistory.find({
    userId,
    repoUrl: repository.url,
    status: 'Open',
    ...(seenFingerprints.size ? { fingerprint: { $nin: [...seenFingerprints] } } : {})
  }).lean();
  if (openRecords.length) {
    await ErrorHistory.updateMany(
      { _id: { $in: openRecords.map(record => record._id) } },
      { $set: { status: 'Resolved', lastDetectedAt: now } }
    );
  }
  return { newErrors, resolvedErrors: openRecords.length };
}

module.exports = { saveScanIssues };
