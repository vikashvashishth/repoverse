const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const { collectSourceContext } = require('../src/services/analysisService');
const { selectRelevantSources, formatSources, generateAnswer } = require('../src/services/geminiService');
const { changedImpactPaths } = require('../src/controllers/aiController');

test('collects bounded source context and skips secret-named files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'repoverse-ai-context-'));
  try {
    const sourcePath = path.join(directory, 'app.js');
    const secretPath = path.join(directory, '.env.js');
    await fs.writeFile(sourcePath, 'export const answer = 42;');
    await fs.writeFile(secretPath, 'TOKEN=do-not-cache');
    const context = await collectSourceContext([
      { absolutePath: sourcePath, relativePath: 'app.js', extension: '.js', fileName: 'app.js', size: 25 },
      { absolutePath: secretPath, relativePath: '.env.js', extension: '.js', fileName: '.env.js', size: 18 },
    ]);
    assert.deepEqual(Object.keys(context), ['app.js']);
    assert.match(context['app.js'], /answer/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('ranks relevant source files and formats bounded excerpts', () => {
  const context = {
    'docs/api-notes.md': 'API module implementation summary and next steps.',
    'src/services/apiClient.js': 'export const api = createClient();',
    'src/routes/cinemaRoutes.js': 'router.get("/cinemas", getCinemas);',
    'src/auth.js': 'export function authenticate(token) { return token; }',
    'src/home.js': 'export const title = "home";',
  };
  assert.equal(selectRelevantSources(context, 'Where is authenticate handled?')[0].filePath, 'src/auth.js');
  assert.match(formatSources(context, 'authenticate'), /src\/auth\.js/);
  assert.equal(selectRelevantSources(context, 'where is my api?')[0].filePath, 'src/routes/cinemaRoutes.js');
});

test('sends prompts to Gemini using the server key and configured model', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  const previousPost = axios.post;
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'test-model';
  let request;
  axios.post = async (url, body, options) => {
    request = { url, body, options };
    return { data: { candidates: [{ content: { parts: [{ text: '  Gemini answer  ' }] } }] } };
  };
  try {
    assert.equal(await generateAnswer('system prompt', 'user prompt'), 'Gemini answer');
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');
    assert.deepEqual(request.body.systemInstruction, { parts: [{ text: 'system prompt' }] });
    assert.deepEqual(request.body.contents, [{ role: 'user', parts: [{ text: 'user prompt' }] }]);
    assert.equal(request.options.headers['x-goog-api-key'], 'test-key');
  } finally {
    axios.post = previousPost;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
  }
});

test('finds reverse dependency paths impacted by changed files', () => {
  const analysis = {
    graph: {
      links: [
        { source: 'src/page.js', target: 'src/service.js' },
        { source: 'src/service.js', target: 'src/client.js' },
        { source: 'src/other.js', target: 'src/unrelated.js' },
      ],
    },
  };
  assert.deepEqual(
    changedImpactPaths(analysis, ['src/client.js']),
    ['src/service.js', 'src/page.js'],
  );
});
