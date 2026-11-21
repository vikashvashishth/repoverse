const crypto = require('crypto');

function normalizeErrorMessage(message = '') {
  return String(message)
    .replace(/[A-Za-z]:\\[^\s:]+|\/tmp\/[^\s:]+/g, '<path>')
    .replace(/\s+/g, ' ').trim();
}

function generateErrorFingerprint(error) {
  const data = [
    String(error.userId), error.repoUrl, error.errorType, error.filePath || '',
    normalizeErrorMessage(error.errorMessage || error.message), error.lineNumber ?? 'unknown'
  ].join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { generateErrorFingerprint, normalizeErrorMessage };
