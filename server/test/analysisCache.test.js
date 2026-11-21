const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('analysis cache survives a server-module reload and remains user-scoped', () => {
  const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'repoverse-analysis-cache-'));
  const previousDirectory = process.env.ANALYSIS_CACHE_DIR;
  const modulePath = require.resolve('../src/services/analysisCache');

  try {
    process.env.ANALYSIS_CACHE_DIR = cacheDirectory;
    delete require.cache[modulePath];
    const firstCache = require(modulePath);
    const analysis = { repository: { name: 'sample' }, graph: { nodes: [], links: [] } };
    const sourceContext = { 'src/index.js': 'export const value = 1;' };
    const id = firstCache.createScan('user-1', analysis, sourceContext);

    delete require.cache[modulePath];
    const restartedCache = require(modulePath);
    assert.deepEqual(restartedCache.getScan('user-1', id), analysis);
    assert.deepEqual(restartedCache.getSourceContext('user-1', id), sourceContext);
    assert.equal(restartedCache.getScan('user-2', id), null);
    assert.equal(restartedCache.getSourceContext('user-2', id), null);

    restartedCache.getScan('user-1', id).graph.nodes.push({ id: 'updated' });
    assert.equal(restartedCache.persistScan('user-1', id), true);

    delete require.cache[modulePath];
    const reloadedCache = require(modulePath);
    assert.deepEqual(reloadedCache.getScan('user-1', id).graph.nodes, [{ id: 'updated' }]);
  } finally {
    delete require.cache[modulePath];
    if (previousDirectory === undefined) delete process.env.ANALYSIS_CACHE_DIR;
    else process.env.ANALYSIS_CACHE_DIR = previousDirectory;
    fs.rmSync(cacheDirectory, { recursive: true, force: true });
  }
});
