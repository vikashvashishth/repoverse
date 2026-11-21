const fs = require('fs/promises');
const path = require('path');
const YAML = require('yaml');

const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

async function discoverApis(files) {
  const endpoints = [];
  const issues = [];
  const candidates = files.filter(file => /(^|\/)(openapi|swagger)(\.\w+)?$/i.test(file.relativePath) || /openapi|swagger/i.test(file.fileName));
  for (const file of candidates) {
    if (!['.json', '.yaml', '.yml'].includes(file.extension)) continue;
    try {
      const text = await fs.readFile(file.absolutePath, 'utf8');
      const spec = file.extension === '.json' ? JSON.parse(text) : YAML.parse(text);
      if (!spec?.paths || typeof spec.paths !== 'object') continue;
      for (const [endpointPath, methods] of Object.entries(spec.paths)) {
        for (const [method, definition] of Object.entries(methods || {})) {
          if (!METHODS.has(method.toLowerCase())) continue;
          const responseSchemas = Object.fromEntries(Object.entries(definition?.responses || {}).flatMap(([status, response]) => Object.entries(response?.content || {}).flatMap(([contentType, content]) => content?.schema ? [[status, { contentType, schema: content.schema }]] : [])));
          endpoints.push({ id: `${file.relativePath}:${method}:${endpointPath}`, filePath: file.relativePath, path: endpointPath, method: method.toUpperCase(), summary: definition?.summary || definition?.description || '', hasSchema: Object.keys(responseSchemas).length > 0, responseSchemas });
        }
      }
    } catch (error) {
      issues.push({ type: 'OpenAPI parse warning', message: `Could not parse API specification: ${error.message}`, severity: 'Medium', suggestedFix: 'Ensure this OpenAPI or Swagger file is valid JSON or YAML.', fileName: file.fileName, filePath: file.relativePath, lineNumber: null });
    }
  }
  return { endpoints, issues };
}

function endpointPattern(pathname) {
  return new RegExp(`^${pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+')}$`);
}

async function discoverStaticApiReferences(files, endpoints) {
  const links = [];
  const sourceFiles = files.filter(file => ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(file.extension));
  const patterns = endpoints.map(endpoint => ({ endpoint, regex: endpointPattern(endpoint.path) }));
  for (const file of sourceFiles) {
    const text = await fs.readFile(file.absolutePath, 'utf8');
    const references = text.matchAll(/(?:\bfetch|\baxios(?:\.(?:get|post|put|patch|delete))?)\s*\(\s*['"`]([^'"`?#]+)(?:\?[^'"`]*)?['"`]/g);
    const matched = new Map();
    for (const reference of references) {
      const value = reference[1];
      let pathname = value;
      try { pathname = new URL(value).pathname; } catch { /* A relative path can be matched as-is. */ }
      for (const { endpoint, regex } of patterns) {
        if (regex.test(pathname)) {
          matched.set(endpoint.id, (matched.get(endpoint.id) || 0) + 1);
        }
      }
    }
    for (const [endpointId, referenceCount] of matched) {
      links.push({ source: file.relativePath, target: endpointId, kind: 'api-reference', status: 'unverified', referenceCount, strength: referenceCount });
    }
  }
  return links;
}

function apiGraph(endpoints) {
  return endpoints.map(endpoint => ({ id: endpoint.id, label: `${endpoint.method} ${endpoint.path}`, type: 'api', status: 'unverified', ...endpoint }));
}

module.exports = { discoverApis, discoverStaticApiReferences, apiGraph };
