const mongoose = require('mongoose');

const repositoryConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  repoUrl: { type: String, required: true, trim: true },
  owner: { type: String, required: true, trim: true },
  repoName: { type: String, required: true, trim: true },
  webhookConfigured: { type: Boolean, default: false },
  webhookVerified: { type: Boolean, default: false },
  webhookSecretEncrypted: { type: String, default: null, select: false },
  lastAnalyzedSha: { type: String, default: null },
  latestCommitSha: { type: String, default: null },
  latestCommitDate: { type: Date, default: null },
  lastSuccessfulAnalysisAt: { type: Date, default: null },
  syncStatus: {
    type: String,
    enum: ['Synced', 'Update Available', 'Analyzing', 'Analysis Failed', 'Not Synced'],
    default: 'Not Synced'
  },
  lastError: { type: String, default: '' },
  processedDeliveryIds: { type: [String], default: [] },
  newErrors: { type: Number, default: 0 },
  resolvedErrors: { type: Number, default: 0 }
}, { timestamps: true });

repositoryConnectionSchema.index({ userId: 1, repoUrl: 1 }, { unique: true });

module.exports = mongoose.model('RepositoryConnection', repositoryConnectionSchema);
