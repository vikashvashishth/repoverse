const axios = require('axios');

const MAX_PROMPT_CHARS = 32_000;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function serviceError(message, status = 503) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function selectRelevantSources(sourceContext, question, limit = 8) {
  const terms = question.toLowerCase().match(/[a-z0-9_./-]{3,}/g) || [];
  const asksWhereApiIs = /\b(where|which file|what file|located|defined|find)\b/i.test(question) &&
    /\b(api|apis|endpoint|endpoints|route|routes)\b/i.test(question);
  return Object.entries(sourceContext || {})
    .map(([filePath, source]) => ({
      filePath,
      source,
      score: terms.reduce((score, term) =>
        score + (filePath.toLowerCase().includes(term) ? 5 : 0) +
          (source.toLowerCase().includes(term) ? 1 : 0), 0) +
        (asksWhereApiIs && /(^|[/\\])(routes?|handlers?|controllers?|api)([/\\.-]|$)/i.test(filePath) ? 30 : 0) +
        (asksWhereApiIs && /\b(?:router|app)\s*\.\s*(?:get|post|put|patch|delete|use)\s*\(/i.test(source) ? 20 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath))
    .slice(0, limit);
}

function formatSources(sourceContext, question, limit = 8) {
  let remaining = MAX_PROMPT_CHARS;
  const files = [];
  for (const item of selectRelevantSources(sourceContext, question, limit)) {
    if (remaining <= 0) break;
    const text = `--- ${item.filePath} ---\n${item.source.slice(0, Math.min(item.source.length, remaining))}`;
    files.push(text);
    remaining -= text.length;
  }
  return files.join('\n\n');
}

async function generateAnswer(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw serviceError('Gemini is not configured. Set GEMINI_API_KEY on the server.');

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  let response;
  try {
    response = await axios.post(
      `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt.slice(0, MAX_PROMPT_CHARS) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
      },
      {
        timeout: 120_000,
        maxContentLength: 256 * 1024,
        maxRedirects: 0,
        headers: { 'x-goog-api-key': apiKey },
      },
    );
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
      throw serviceError('Gemini rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL on the server.', 503);
    }
    if (error.response?.status === 429) {
      throw serviceError('Gemini API quota or rate limit reached. Check your Google AI Studio limits and try again.', 503);
    }
    if (error.response?.status === 404) {
      const detail = error.response.data?.error?.message;
      throw serviceError(detail || `Gemini could not find model "${model}" or it does not support generateContent.`, 502);
    }
    if (error.code === 'ECONNABORTED') {
      throw serviceError('The Gemini request timed out. Try again with a shorter question or repository context.', 504);
    }
    if (error.response?.status) {
      throw serviceError(`Gemini returned HTTP ${error.response.status}. Check the model and Gemini service status.`, 502);
    }
    throw serviceError('Could not reach the Gemini API. Check the server network connection.');
  }

  const parts = response.data?.candidates?.[0]?.content?.parts || [];
  const answer = parts.map(part => part.text || '').join('');
  if (!answer.trim()) throw serviceError('Gemini returned an empty answer.', 502);
  return answer.trim();
}

module.exports = {
  MAX_PROMPT_CHARS,
  formatSources,
  generateAnswer,
  selectRelevantSources,
};