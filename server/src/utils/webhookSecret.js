const crypto = require('crypto');

function secretKey() {
  const source = process.env.GITHUB_WEBHOOK_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) throw new Error('A GITHUB_WEBHOOK_ENCRYPTION_KEY or JWT_SECRET is required to configure webhooks.');
  return crypto.createHash('sha256').update(source).digest();
}

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptSecret(payload) {
  if (!payload) throw new Error('Webhook secret is not configured.');
  const [ivText, tagText, encryptedText] = payload.split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Webhook secret is invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };
