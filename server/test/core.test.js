const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRepoUrl } = require('../src/utils/normalizeRepoUrl');
const { generateErrorFingerprint } = require('../src/services/fingerprintService');

test('normalizes a GitHub URL into a stable repository identity', () => {
  assert.equal(normalizeRepoUrl('https://github.com/Acme/Widget.git/?tab=readme#section'), 'https://github.com/acme/widget');
});
test('rejects non-GitHub repository URLs', () => {
  assert.throws(() => normalizeRepoUrl('https://example.com/acme/widget'), /Only public/);
});
test('error fingerprint does not vary with whitespace in its message', () => {
  const base = { userId: 'user-1', repoUrl: 'https://github.com/acme/widget', errorType: 'Missing relative import', filePath: 'src/App.js', lineNumber: 12 };
  assert.equal(generateErrorFingerprint({ ...base, errorMessage: 'Cannot   resolve\n  path' }), generateErrorFingerprint({ ...base, errorMessage: 'Cannot resolve path' }));
});
