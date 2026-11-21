const mongoose = require('mongoose');

const errorHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  repoName: { type: String, required: true, trim: true },
  repoUrl: { type: String, required: true, trim: true },
  fingerprint: { type: String, required: true },
  errorType: { type: String, required: true },
  errorMessage: { type: String, required: true },
  fileName: { type: String, default: '' },
  filePath: { type: String, default: '' },
  lineNumber: { type: Number, default: null },
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], required: true },
  suggestedFix: { type: String, default: '' },
  status: { type: String, enum: ['Open', 'Resolved', 'Ignored'], default: 'Open' },
  firstDetectedAt: { type: Date, required: true },
  lastDetectedAt: { type: Date, required: true },
  occurrenceCount: { type: Number, default: 1, min: 1 }
}, { versionKey: false });

errorHistorySchema.index({ userId: 1, fingerprint: 1 }, { unique: true });
errorHistorySchema.index({ userId: 1, repoUrl: 1 });
errorHistorySchema.index({ userId: 1, lastDetectedAt: -1 });

module.exports = mongoose.model('ErrorHistory', errorHistorySchema);
