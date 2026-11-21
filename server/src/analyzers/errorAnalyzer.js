const fs = require('fs/promises');
const { ESLint } = require('eslint');

async function eslintWarnings(files) {
  const lintable = files.filter(file => ['.js', '.mjs', '.cjs'].includes(file.extension));
  if (!lintable.length) return [];
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: { languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }, rules: { 'no-undef': 'warn', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] } }
  });
  const warnings = [];
  for (const file of lintable) {
    try {
      const results = await eslint.lintText(await fs.readFile(file.absolutePath, 'utf8'), { filePath: file.fileName });
      for (const message of results[0].messages) {
        warnings.push({ type: 'ESLint warning', message: message.message, severity: message.fatal ? 'High' : 'Low', suggestedFix: `Address ESLint rule ${message.ruleId || 'parsing'} before relying on this code path.`, fileName: file.fileName, filePath: file.relativePath, lineNumber: message.line || null });
      }
    } catch { /* A lint configuration problem must never make a repository import fail. */ }
  }
  return warnings;
}

module.exports = { eslintWarnings };
