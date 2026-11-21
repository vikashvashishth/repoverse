const ErrorHistory = require('../models/ErrorHistory');
const { normalizeRepoUrl } = require('../utils/normalizeRepoUrl');

function pageValues(query) { return { page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)) }; }
async function repositories(req, res, next) {
  try {
    const records = await ErrorHistory.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$repoUrl', repoName: { $first: '$repoName' }, totalErrors: { $sum: 1 }, openErrors: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } }, resolvedErrors: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } }, ignoredErrors: { $sum: { $cond: [{ $eq: ['$status', 'Ignored'] }, 1, 0] } }, lastDetectedAt: { $max: '$lastDetectedAt' } } },
      { $project: { _id: 0, repoUrl: '$_id', repoName: 1, totalErrors: 1, openErrors: 1, resolvedErrors: 1, ignoredErrors: 1, lastDetectedAt: 1 } }, { $sort: { lastDetectedAt: -1 } }
    ]);
    res.json({ repositories: records });
  } catch (error) { next(error); }
}
async function list(req, res, next) {
  try {
    const { page, limit } = pageValues(req.query); const filter = { userId: req.user._id };
    if (req.query.repoUrl) filter.repoUrl = normalizeRepoUrl(req.query.repoUrl);
    if (['Open', 'Resolved', 'Ignored'].includes(req.query.status)) filter.status = req.query.status;
    if (['Critical', 'High', 'Medium', 'Low'].includes(req.query.severity)) filter.severity = req.query.severity;
    if (req.query.q?.trim()) { const safe = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ filePath: new RegExp(safe, 'i') }, { errorType: new RegExp(safe, 'i') }]; }
    if (req.query.from || req.query.to) { filter.lastDetectedAt = {}; if (req.query.from) filter.lastDetectedAt.$gte = new Date(req.query.from); if (req.query.to) filter.lastDetectedAt.$lte = new Date(req.query.to); }
    const [errors, total] = await Promise.all([ErrorHistory.find(filter).sort({ lastDetectedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), ErrorHistory.countDocuments(filter)]);
    res.json({ errors, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
}
async function updateStatus(req, res, next) {
  try {
    if (!['Open', 'Resolved', 'Ignored'].includes(req.body.status)) return res.status(400).json({ message: 'Choose Open, Resolved, or Ignored.' });
    const item = await ErrorHistory.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { status: req.body.status }, { new: true });
    if (!item) return res.status(404).json({ message: 'Historical error not found.' });
    res.json({ error: item });
  } catch (error) { next(error); }
}
async function remove(req, res, next) {
  try { const result = await ErrorHistory.deleteOne({ _id: req.params.id, userId: req.user._id }); if (!result.deletedCount) return res.status(404).json({ message: 'Historical error not found.' }); res.status(204).end(); } catch (error) { next(error); }
}
async function removeRepository(req, res, next) {
  try { const repoUrl = normalizeRepoUrl(req.body.repoUrl); const result = await ErrorHistory.deleteMany({ userId: req.user._id, repoUrl }); res.json({ deletedCount: result.deletedCount }); } catch (error) { next(error); }
}
module.exports = { repositories, list, updateStatus, remove, removeRepository };
