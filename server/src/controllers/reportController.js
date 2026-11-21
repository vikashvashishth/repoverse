const { getScan } = require("../services/analysisCache");

function reportData(analysis) {
  const severity = analysis.issues.reduce(
    (all, issue) => ({
      ...all,
      [issue.severity]: (all[issue.severity] || 0) + 1,
    }),
    { Critical: 0, High: 0, Medium: 0, Low: 0 },
  );
  return {
    generatedAt: new Date().toISOString(),
    repository: analysis.repository,
    analyzedAt: analysis.analyzedAt,
    stats: analysis.stats,
    languages: analysis.languages,
    dependencies: analysis.links,
    endpoints: analysis.endpoints,
    issues: analysis.issues,
    severityDistribution: severity,
  };
}
function escape(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
function htmlReport(data) {
  const issueRows =
    data.issues
      .map(
        (issue) =>
          `<tr><td>${escape(issue.severity)}</td><td>${escape(issue.type)}</td><td>${escape(issue.filePath)}</td><td>${escape(issue.lineNumber ?? "—")}</td><td>${escape(issue.message)}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="5">No issues detected in this scan.</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>RepoVerse report</title><style>body{font-family:Arial,sans-serif;color:#1f2937;margin:42px}h1{margin-bottom:4px}a{color:#2563eb}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #d1d5db;padding:8px;text-align:left;vertical-align:top}th{background:#f3f4f6}.stats{display:flex;gap:24px;flex-wrap:wrap}.stat{padding:12px 16px;background:#f8fafc;border-radius:8px}</style></head><body><h1>RepoVerse 3D analysis report</h1><p><strong>${escape(data.repository.name)}</strong> · <a href="${escape(data.repository.url)}">${escape(data.repository.url)}</a></p><p>Generated ${escape(data.generatedAt)}. This report covers static analysis only; it does not claim runtime behavior.</p><div class="stats"><div class="stat">Files: ${data.stats.totalFiles}</div><div class="stat">Dependencies: ${data.stats.dependencyCount}</div><div class="stat">API endpoints: ${data.stats.endpointCount}</div><div class="stat">Issues: ${data.stats.issueCount}</div></div><h2>Detected issues and warnings</h2><table><thead><tr><th>Severity</th><th>Type</th><th>File</th><th>Line</th><th>Message</th></tr></thead><tbody>${issueRows}</tbody></table></body></html>`;
}
function download(req, res) {
  const analysis = getScan(req.user._id, req.params.analysisId);
  if (!analysis)
    return res
      .status(404)
      .json({
        message:
          "This analysis is no longer available. Import the repository again to generate a report.",
      });
  const data = reportData(analysis);
  const basename = `${analysis.repository.name.replace(/[^a-z0-9-_]/gi, "-")}-repoverse-report`;
  if (req.query.format === "html") {
    res.type("html").attachment(`${basename}.html`).send(htmlReport(data));
  } else
    res
      .type("json")
      .attachment(`${basename}.json`)
      .send(JSON.stringify(data, null, 2));
}
module.exports = { download };
