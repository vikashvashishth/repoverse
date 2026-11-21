import { Download, FileJson, FileText, FileWarning } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import useAnalysis from "../hooks/useAnalysis";
import LoadingSpinner from "../components/LoadingSpinner";
import api, { apiMessage } from "../services/api";

export default function Reports() {
  const { analysis, analysisId, error, loading } = useAnalysis();
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState("");
  if (loading) return <LoadingSpinner label="Loading report information…" />;
  if (error || !analysis)
    return (
      <section className="section-pad">
        <div className="container">
          <div className="alert alert-danger">
            {error || "Analysis unavailable."}
          </div>
        </div>
      </section>
    );
  const download = async (format) => {
    setDownloading(format);
    setMessage("");
    try {
      const response = await api.get(
        `/reports/${analysisId}?format=${format}`,
        { responseType: "blob" },
      );
      const filename =
        response.headers["content-disposition"]?.match(
          /filename="?([^";]+)"?/,
        )?.[1] || `repoverse-report.${format}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(response.data);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setMessage(apiMessage(err, "Could not generate the report."));
    } finally {
      setDownloading("");
    }
  };
  const severity = ["Critical", "High", "Medium", "Low"].map((level) => [
    level,
    analysis.issues.filter((issue) => issue.severity === level).length,
  ]);
  return (
    <section className="section-pad">
      <div className="container narrow-wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Report generation</p>
            <h1>{analysis.repository.name} analysis report</h1>
            <p>
              Reports are created from the current actual scan and are not
              retained in MongoDB.
            </p>
          </div>
          <Link
            className="btn btn-outline-primary"
            to={`/analysis/${analysisId}`}
          >
            Back to analysis
          </Link>
        </div>
        {message && <div className="alert alert-danger">{message}</div>}
        <div className="report-summary">
          <div>
            <span>Total files</span>
            <strong>{analysis.stats.totalFiles}</strong>
          </div>
          <div>
            <span>Dependencies</span>
            <strong>{analysis.stats.dependencyCount}</strong>
          </div>
          <div>
            <span>API endpoints</span>
            <strong>{analysis.stats.endpointCount}</strong>
          </div>
          <div>
            <span>Findings</span>
            <strong>{analysis.stats.issueCount}</strong>
          </div>
        </div>
        <div className="row g-4 mt-1">
          <div className="col-md-6">
            <article className="download-card">
              <FileJson />
              <h2>JSON report</h2>
              <p>
                Structured scan information for integration into your own
                tooling or archive.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => download("json")}
                disabled={Boolean(downloading)}
              >
                {downloading === "json" ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <Download size={17} />
                )}{" "}
                Download JSON
              </button>
            </article>
          </div>
          <div className="col-md-6">
            <article className="download-card">
              <FileText />
              <h2>HTML report</h2>
              <p>
                A self-contained, readable report for sharing with your team.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => download("html")}
                disabled={Boolean(downloading)}
              >
                {downloading === "html" ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <Download size={17} />
                )}{" "}
                Download HTML
              </button>
            </article>
          </div>
        </div>
        <article className="panel-card mt-4">
          <div className="panel-header">
            <div>
              <h2>Severity distribution</h2>
              <p>Selected static analysis findings in this report.</p>
            </div>
            <FileWarning />
          </div>
          {severity.map(([level, count]) => (
            <div className="severity-bar" key={level}>
              <span>{level}</span>
              <div>
                <i
                  className={level.toLowerCase()}
                  style={{
                    width: `${analysis.issues.length ? (count / analysis.issues.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>{count}</strong>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
