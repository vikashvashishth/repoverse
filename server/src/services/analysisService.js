const fs = require('fs/promises');
const { walkRepository, buildTree } = require('../analyzers/fileAnalyzer');
const { analyzeDependencies } = require('../analyzers/dependencyAnalyzer');
const { discoverApis, discoverStaticApiReferences, apiGraph } = require('../analyzers/apiAnalyzer');
const { eslintWarnings } = require('../analyzers/errorAnalyzer');

const AI_SOURCE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.java', '.go',
  '.rs', '.rb', '.php', '.cs', '.html', '.css', '.scss', '.json', '.yaml',
  '.yml', '.sql', '.md',
]);
const MAX_AI_SOURCE_FILES = 100;
const MAX_AI_SOURCE_FILE_BYTES = 32 * 1024;
const MAX_AI_SOURCE_BYTES = 1024 * 1024;

async function collectSourceContext(files) {
  const context = {};
  let totalBytes = 0;
  for (const file of files) {
    if (!AI_SOURCE_EXTENSIONS.has(file.extension)) continue;
    if (/(\.env|secret|credential|private.?key|\.pem$|\.p12$)/i.test(file.fileName)) continue;
    if (file.size > MAX_AI_SOURCE_FILE_BYTES || totalBytes + file.size > MAX_AI_SOURCE_BYTES) continue;
    if (Object.keys(context).length >= MAX_AI_SOURCE_FILES) break;
    const source = await fs.readFile(file.absolutePath, 'utf8');
    context[file.relativePath] = source;
    totalBytes += Buffer.byteLength(source, 'utf8');
  }
  return context;
}

async function analyzeRepository(root, repository) {
  const { files, totalSize, languages } = await walkRepository(root);
  const sourceContext = await collectSourceContext(files);
  const dependency = await analyzeDependencies(files);
  const api = await discoverApis(files);
  const apiLinks = await discoverStaticApiReferences(files, api.endpoints);
  const lintIssues = await eslintWarnings(files);
  const issues = [...dependency.issues, ...api.issues, ...lintIssues];
  const issuePaths = new Set(issues.map(issue => issue.filePath));
  const fileNodes = files.map(file => ({ id: file.relativePath, label: file.fileName, path: file.relativePath, type: 'file', language: file.language, status: issuePaths.has(file.relativePath) ? 'warning' : 'healthy', extension: file.extension, size: file.size, imports: dependency.metadata[file.relativePath]?.imports || [], exports: dependency.metadata[file.relativePath]?.exports || [] }));
  const endpointNodes = apiGraph(api.endpoints);
  return {
    repository, analyzedAt: new Date().toISOString(), stats: { totalFiles: files.length, totalBytes: totalSize, dependencyCount: dependency.links.length, endpointCount: api.endpoints.length, issueCount: issues.length }, languages,
    tree: buildTree(files), files: fileNodes, links: [...dependency.links, ...apiLinks], endpoints: api.endpoints, graph: { nodes: [...fileNodes, ...endpointNodes], links: [...dependency.links, ...apiLinks] }, issues, sourceContext
  };
}

module.exports = { analyzeRepository, collectSourceContext };
