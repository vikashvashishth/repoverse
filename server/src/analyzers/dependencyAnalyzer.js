const fs = require('fs/promises');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ts = require('typescript');

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const RESOLVE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json'];

function issue(file, type, message, severity, suggestedFix, lineNumber = null) {
  return { type, message, severity, suggestedFix, fileName: file.fileName, filePath: file.relativePath, lineNumber };
}

function resolveRelative(fromPath, source, allPaths) {
  if (!source.startsWith('.')) return null;
  const withoutDot = path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), source));
  const candidates = [withoutDot, ...RESOLVE_EXTENSIONS.map(ext => withoutDot + ext), ...RESOLVE_EXTENSIONS.map(ext => `${withoutDot}/index${ext}`)];
  return candidates.find(candidate => allPaths.has(candidate)) || null;
}

async function analyzeDependencies(files) {
  const codeFiles = files.filter(file => CODE_EXTENSIONS.has(file.extension));
  const allPaths = new Set(files.map(file => file.relativePath));
  const links = [];
  const importsByFile = new Map();
  const metadata = new Map();
  const issues = [];

  for (const file of codeFiles) {
    const source = await fs.readFile(file.absolutePath, 'utf8');
    const imports = [];
    const exports = [];
    try {
      const ast = parser.parse(source, {
        sourceType: 'unambiguous', errorRecovery: false,
        plugins: ['jsx', 'typescript', 'dynamicImport', 'importMeta', 'classProperties', 'decorators-legacy', 'topLevelAwait']
      });
      traverse(ast, {
        ImportDeclaration(nodePath) { imports.push({ source: nodePath.node.source.value, line: nodePath.node.loc?.start.line }); },
        ExportNamedDeclaration(nodePath) {
          if (nodePath.node.source) imports.push({ source: nodePath.node.source.value, line: nodePath.node.loc?.start.line });
          else exports.push('named');
        },
        ExportDefaultDeclaration() { exports.push('default'); },
        CallExpression(nodePath) {
          const node = nodePath.node;
          if (node.callee.type === 'Identifier' && node.callee.name === 'require' && node.arguments[0]?.type === 'StringLiteral') {
            imports.push({ source: node.arguments[0].value, line: node.loc?.start.line });
          }
        }
      });
    } catch (error) {
      const line = error.loc?.line || null;
      issues.push(issue(file, 'JavaScript syntax error', error.message.replace(/^.*?:\s*/, ''), 'High', 'Correct the parser-reported syntax near this location.', line));
    }
    if (file.extension === '.ts' || file.extension === '.tsx') {
      const sourceFile = ts.createSourceFile(file.absolutePath, source, ts.ScriptTarget.Latest, true, file.extension === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      for (const diagnostic of sourceFile.parseDiagnostics) {
        const position = diagnostic.start == null ? null : sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
        issues.push(issue(file, 'TypeScript diagnostic', ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '), 'High', 'Resolve this TypeScript parser diagnostic.', position));
      }
    }
    for (const imported of imports) {
      const target = resolveRelative(file.relativePath, imported.source, allPaths);
      if (imported.source.startsWith('.') && !target) {
        issues.push(issue(file, 'Missing relative import', `Cannot resolve relative import "${imported.source}".`, 'High', 'Correct the import path or add the referenced file.', imported.line));
      }
      if (target) links.push({ source: file.relativePath, target, kind: 'import', status: 'healthy' });
    }
    importsByFile.set(file.relativePath, imports);
    metadata.set(file.relativePath, { imports: imports.map(value => value.source), exports });
  }

  const adjacency = new Map();
  links.forEach(link => adjacency.set(link.source, [...(adjacency.get(link.source) || []), link.target]));
  const state = new Map(); const seenCycles = new Set();
  function visit(node, trail) {
    state.set(node, 'visiting');
    for (const next of adjacency.get(node) || []) {
      if (state.get(next) === 'visiting') {
        const cycle = [...trail.slice(trail.indexOf(next)), next];
        const key = cycle.join('>');
        if (!seenCycles.has(key)) {
          seenCycles.add(key);
          const file = files.find(candidate => candidate.relativePath === node);
          issues.push(issue(file, 'Circular dependency', `Static circular dependency detected: ${cycle.join(' → ')}.`, 'Medium', 'Move shared code into a separate module or invert one dependency.'));
        }
      } else if (!state.get(next)) visit(next, [...trail, next]);
    }
    state.set(node, 'done');
  }
  for (const file of codeFiles) if (!state.get(file.relativePath)) visit(file.relativePath, [file.relativePath]);

  return { links, issues, metadata: Object.fromEntries(metadata) };
}

module.exports = { analyzeDependencies, CODE_EXTENSIONS };
