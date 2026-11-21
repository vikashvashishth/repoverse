const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { walkRepository } = require('../src/analyzers/fileAnalyzer');
const { analyzeDependencies } = require('../src/analyzers/dependencyAnalyzer');
const { discoverStaticApiReferences } = require('../src/analyzers/apiAnalyzer');

const root = path.join(__dirname, 'fixtures', 'sample-repo');

test('detects an unresolved static relative import', async () => {
  const { files } = await walkRepository(root);
  const result = await analyzeDependencies(files);
  assert.equal(result.issues.some(issue => issue.type === 'Missing relative import' && issue.filePath === 'src/App.js'), true);
});

test('maps a literal frontend fetch URL to a documented OpenAPI-style endpoint', async () => {
  const { files } = await walkRepository(root);
  const endpoints = [{ id: 'spec:get:/users/{id}', path: '/users/{id}' }];
  const links = await discoverStaticApiReferences(files, endpoints);
  assert.deepEqual(links, [{ source: 'src/App.js', target: 'spec:get:/users/{id}', kind: 'api-reference', status: 'unverified', referenceCount: 1, strength: 1 }]);
});
