const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const scans = new Map();
const TTL = 60 * 60 * 1000;
const cacheDirectory = process.env.ANALYSIS_CACHE_DIR || path.join(__dirname, '../../tmp/analysis-cache');

fs.mkdirSync(cacheDirectory, { recursive: true });

function cachePath(id) {
  return path.join(cacheDirectory, `${id}.json`);
}

function removeExpired(now = Date.now()) {
  for (const [id, scan] of scans) {
    if (scan.expiresAt >= now) continue;
    scans.delete(id);
    try {
      fs.rmSync(cachePath(id), { force: true });
    } catch (error) {
      console.error(`Could not remove expired analysis cache ${id}:`, error);
    }
  }
}

function loadScans() {
  for (const entry of fs.readdirSync(cacheDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const id = entry.name.slice(0, -5);
    try {
      const scan = JSON.parse(fs.readFileSync(path.join(cacheDirectory, entry.name), 'utf8'));
      if (
        scan.id !== id ||
        typeof scan.userId !== 'string' ||
        !scan.analysis ||
        !Number.isFinite(scan.expiresAt)
      ) {
        throw new Error('Invalid analysis cache entry.');
      }
      if (scan.expiresAt <= Date.now()) {
        fs.rmSync(path.join(cacheDirectory, entry.name), { force: true });
        continue;
      }
      scans.set(id, scan);
    } catch (error) {
      console.error(`Could not load analysis cache ${entry.name}:`, error);
    }
  }
}

function persist(id, scan) {
  const destination = cachePath(id);
  const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify({ id, ...scan }), { mode: 0o600 });
    fs.renameSync(temporary, destination);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch (cleanupError) {
      console.error(`Could not clean temporary analysis cache ${temporary}:`, cleanupError);
    }
    throw error;
  }
}

function createScan(userId, analysis, sourceContext = {}) {
  const id = crypto.randomUUID();
  const scan = { userId: String(userId), analysis, sourceContext, expiresAt: Date.now() + TTL };
  persist(id, scan);
  scans.set(id, scan);
  return id;
}

function getScan(userId, id) {
  const scan = scans.get(id);
  if (!scan || scan.expiresAt < Date.now()) {
    if (scan) {
      scans.delete(id);
      fs.rmSync(cachePath(id), { force: true });
    }
    return null;
  }
  return scan.userId === String(userId) ? scan.analysis : null;
}

function persistScan(userId, id) {
  const scan = scans.get(id);
  if (!scan || scan.userId !== String(userId) || scan.expiresAt < Date.now()) return false;
  persist(id, scan);
  return true;
}

function getSourceContext(userId, id) {
  const scan = scans.get(id);
  if (!scan || scan.expiresAt < Date.now()) {
    if (scan) {
      scans.delete(id);
      fs.rmSync(cachePath(id), { force: true });
    }
    return null;
  }
  return scan.userId === String(userId) ? scan.sourceContext || {} : null;
}

loadScans();
setInterval(removeExpired, TTL).unref();

module.exports = { createScan, getScan, getSourceContext, persistScan };
