const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const unzipper = require('unzipper');

const MAX_FILES = 3000;
const MAX_TOTAL_SIZE = 80 * 1024 * 1024;
const IGNORED = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor']);

function safeRelative(name) {
  const clean = name.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean.split('/').some(part => part === '..' || part === '.')) return null;
  return clean;
}

async function safeExtract(zipPath, destination) {
  const directory = await unzipper.Open.file(zipPath);
  let count = 0;
  let total = 0;
  for (const entry of directory.files) {
    const relative = safeRelative(entry.path);
    if (!relative || entry.type === 'Directory') continue;
    const parts = relative.split('/');
    if (parts.some(part => IGNORED.has(part))) continue;
    count += 1;
    total += entry.uncompressedSize || 0;
    if (count > MAX_FILES) throw new Error(`Archive has too many files (limit: ${MAX_FILES}).`);
    if (total > MAX_TOTAL_SIZE) throw new Error('Archive extracts to more than the 80 MB safety limit.');
    const target = path.resolve(destination, relative);
    if (!target.startsWith(path.resolve(destination) + path.sep)) throw new Error('Unsafe archive path rejected.');
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await new Promise((resolve, reject) => entry.stream()
      .pipe(fs.createWriteStream(target, { flags: 'wx' }))
      .on('finish', resolve).on('error', reject));
  }
  return { fileCount: count, extractedBytes: total };
}

module.exports = { safeExtract, MAX_FILES, MAX_TOTAL_SIZE, IGNORED };
