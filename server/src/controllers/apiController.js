const dns = require('dns').promises;
const net = require('net');
const axios = require('axios');
const Ajv = require('ajv');
const { getScan, persistScan } = require('../services/analysisCache');
const { saveScanIssues } = require('../services/errorHistoryService');

const REQUEST_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const INSPECTION_TIMEOUT_MS = 60_000;

function targetError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function privateAddress(address) {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 169 && b === 254) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0);
  }
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) return privateAddress(normalized.slice(7));
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}
async function validateTarget(rawUrl) {
  let url; try { url = new URL(rawUrl); } catch { throw targetError('Enter a complete http(s) API URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw targetError('Only unauthenticated http(s) URLs are accepted.');
  if (url.hostname.toLowerCase() === 'localhost') throw targetError('Local and internal network API targets are not allowed.');
  const records = await dns.lookup(url.hostname, { all: true });
  if (!records.length || records.some(record => privateAddress(record.address))) throw targetError('Private or internal network API targets are not allowed.');
  return url.toString();
}

function endpointPathPattern(pathname) {
  const escaped = pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\\\{[^}]+\\\}/g, '[^/]+')}/?$`);
}

function endpointMatchesUrl(endpointPath, pathname) {
  const pattern = endpointPathPattern(endpointPath);
  const segments = pathname.split('/').filter(Boolean);
  return segments.some((_, index) => pattern.test(`/${segments.slice(index).join('/')}`));
}

function allowedMethods(headers) {
  const value = headers.allow || headers['access-control-allow-methods'] || '';
  return [...new Set(String(value).split(',').map(method => method.trim().toUpperCase()).filter(method => REQUEST_METHODS.has(method)))];
}

async function inspectEndpoint(req, res, next) {
  try {
    const { targetUrl, analysisId } = req.body;
    const analysis = analysisId && getScan(req.user._id, analysisId);
    if (analysisId && !analysis) return res.status(404).json({ message: 'Analysis not found.' });
    const checkedUrl = await validateTarget(targetUrl);
    let response;
    try {
      response = await axios({
        url: checkedUrl,
        method: 'options',
        timeout: INSPECTION_TIMEOUT_MS,
        maxRedirects: 0,
        maxContentLength: 32 * 1024,
        validateStatus: () => true,
        headers: { Accept: '*/*', 'User-Agent': 'RepoVerse-3D API Inspector' },
      });
    } catch (error) {
      return res.status(502).json({
        message: error.code === 'ECONNABORTED'
          ? 'The API did not respond to inspection within 60 seconds. Its host may be starting up or unavailable; wait a moment and retry.'
          : 'Could not inspect this API URL. Check that the public endpoint is reachable.',
      });
    }

    const documentedEndpoints = (analysis?.endpoints || []).filter(endpoint =>
      endpointMatchesUrl(endpoint.path, new URL(checkedUrl).pathname),
    );
    const methods = [...new Set([
      ...allowedMethods(response.headers),
      ...documentedEndpoints.map(endpoint => endpoint.method.toUpperCase()).filter(method => REQUEST_METHODS.has(method)),
    ])];
    const source = documentedEndpoints.length && allowedMethods(response.headers).length
      ? 'openapi-and-options'
      : documentedEndpoints.length
        ? 'openapi'
        : allowedMethods(response.headers).length
          ? 'options'
          : 'unavailable';

    res.json({
      targetUrl: checkedUrl,
      optionsStatus: response.status,
      allowHeader: response.headers.allow || null,
      methods,
      source,
      endpoints: documentedEndpoints.map(({ id, method, path, summary, responseSchemas }) => ({
        id, method, path, summary, responseSchemas,
      })),
      message: methods.length
        ? null
        : 'The API did not advertise supported methods and no matching OpenAPI endpoint was found.',
    });
  } catch (error) {
    next(error);
  }
}

async function testEndpoint(req, res, next) {
  try {
    const { targetUrl, method = 'GET', requestBody, analysisId, endpointId, responseSchemas } = req.body;
    const normalizedMethod = String(method).toUpperCase();
    if (!REQUEST_METHODS.has(normalizedMethod)) {
      return res.status(400).json({ message: 'Choose a supported HTTP request method.' });
    }
    const analysis = analysisId && getScan(req.user._id, analysisId);
    if (analysisId && !analysis) return res.status(404).json({ message: 'Analysis not found.' });
    const checkedUrl = await validateTarget(targetUrl);
    const started = performance.now();
    let response;
    try {
      response = await axios({ url: checkedUrl, method: normalizedMethod.toLowerCase(), data: requestBody, timeout: 10000, maxRedirects: 0, maxContentLength: 256 * 1024, validateStatus: () => true, headers: { Accept: 'application/json, text/plain, */*', ...(requestBody === undefined ? {} : { 'Content-Type': 'application/json' }), 'User-Agent': 'RepoVerse-3D API Tester' } });
    } catch (error) {
      const payload = { ok: false, status: null, responseTimeMs: Math.round(performance.now() - started), error: error.code === 'ECONNABORTED' ? 'Request timed out after 10 seconds.' : 'Connection failed. The response body is not retained.' };
      await recordApiResult(req.user, analysis, analysisId, endpointId, targetUrl, method, payload);
      return res.json(payload);
    }
    const contentType = response.headers['content-type'] || null;
    let schemaValidation = 'No documented response schema was supplied.'; let schemaError = null;
    const responseDefinition = responseSchemas?.[String(response.status)] || responseSchemas?.default;
    if (responseDefinition) {
      if (!contentType?.toLowerCase().includes(responseDefinition.contentType.split(';')[0].toLowerCase())) schemaError = `Expected response format ${responseDefinition.contentType}, received ${contentType || 'unknown'}.`;
      else if (responseDefinition.contentType.includes('json')) {
        try { const validate = new Ajv({ strict: false, allErrors: true }).compile(responseDefinition.schema); if (!validate(response.data)) schemaError = `Response does not match the documented schema: ${(validate.errors || []).map(item => item.message).filter(Boolean).join(', ')}.`; else schemaValidation = 'Response matches the documented JSON schema.'; } catch { schemaValidation = 'The documented schema could not be evaluated automatically.'; }
      } else schemaValidation = 'Response format matches the documented content type.';
    }
    const payload = { ok: response.status >= 200 && response.status < 400 && !schemaError, status: response.status, responseTimeMs: Math.round(performance.now() - started), contentType, schemaValidation, error: schemaError };
    await recordApiResult(req.user, analysis, analysisId, endpointId, targetUrl, method, payload);
    res.json(payload);
  } catch (error) { next(error); }
}
async function recordApiResult(user, analysis, analysisId, endpointId, targetUrl, method, result) {
  if (!analysis || !endpointId) return;
  const node = analysis.graph.nodes.find(item => item.id === endpointId);
  if (node) node.status = result.ok ? 'healthy' : 'error';
  if (result.ok) {
    persistScan(user._id, analysisId);
    return;
  }
  const endpoint = analysis.endpoints.find(item => item.id === endpointId);
  const type = result.status == null
    ? 'Failed API request'
    : result.error
      ? 'API response schema mismatch'
      : 'API returned unsuccessful HTTP status';
  const issue = { type, message: `${method.toUpperCase()} ${targetUrl}: ${result.error || `received HTTP ${result.status}`}`, severity: 'Medium', suggestedFix: 'Verify the public API target, endpoint contract, expected response, and any required credentials outside RepoVerse.', fileName: endpoint?.filePath?.split('/').pop() || '', filePath: endpoint?.filePath || '', lineNumber: null };
  analysis.issues.push(issue);
  await saveScanIssues(user._id, analysis.repository, [issue]);
  persistScan(user._id, analysisId);
}
module.exports = { inspectEndpoint, testEndpoint, allowedMethods, endpointMatchesUrl };
