import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  FileWarning,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import useAnalysis from "../hooks/useAnalysis";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ErrorAnalysis() {
  const { analysis, analysisId, error, loading } = useAnalysis();
  if (loading) return <LoadingSpinner label="Loading detected issues…" />;
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
  const ordered = [...analysis.issues].sort(
    (a, b) =>
      ["Critical", "High", "Medium", "Low"].indexOf(a.severity) -
      ["Critical", "High", "Medium", "Low"].indexOf(b.severity),
  );
  return (
    <section className="section-pad py-4">
      <div className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Static analysis findings</p>
            <h1>Issues and warnings</h1>
            <p>
              These findings are recorded to your repository history with a
              stable fingerprint. Confirmed static errors and potential warnings
              remain distinct.
            </p>
          </div>
          <Link
            className="btn btn-outline-primary"
            to={`/analysis/${analysisId}`}
          >
            Back to analysis
          </Link>
        </div>
        {ordered.length ? (
          <div className="issue-list">
            {ordered.map((issue, index) => (
              <article
                className="issue-card"
                key={`${issue.filePath}-${issue.type}-${index}`}
              >
                <div className={`issue-icon ${issue.severity.toLowerCase()}`}>
                  {issue.severity === "Low" ? (
                    <CircleAlert />
                  ) : (
                    <AlertTriangle />
                  )}
                </div>
                <div className="flex-grow-1">
                  <div className="issue-topline">
                    <span
                      className={`severity ${issue.severity.toLowerCase()}`}
                    >
                      {issue.severity}
                    </span>
                    <span className="issue-type">{issue.type}</span>
                  </div>
                  <h2>{issue.message}</h2>
                  <p className="path-text">
                    {issue.filePath}
                    {issue.lineNumber ? `:${issue.lineNumber}` : ""}
                  </p>
                  <p className="suggestion">
                    <strong>Suggested next step:</strong> {issue.suggestedFix}
                  </p>
                  <Link
                    className="btn btn-sm btn-outline-primary"
                    to={`/ai/${analysisId}?issue=${analysis.issues.indexOf(issue)}`}
                  >
                    <Sparkles size={15} className="me-1" />
                    Explain with AI
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CheckCircle2 className="text-success" size={31} />
            <h3>No selected static issues detected</h3>
            <p>
              This scan did not find parser, static dependency, API
              specification, or selected lint findings. It does not prove the
              repository is free of runtime bugs.
            </p>
            <Link
              className="btn btn-outline-primary"
              to={`/visualization/${analysisId}`}
            >
              Explore the architecture map
            </Link>
          </div>
        )}
        <div className="history-callout">
          <FileWarning />
          <div>
            <strong>Need to manage historical issue status?</strong>
            <p className="mb-0">
              Use Repository History to mark saved findings as resolved,
              ignored, or open.
            </p>
          </div>
          <Link className="btn btn-outline-primary" to="/history">
            Open history
          </Link>
        </div>
      </div>
    </section>
  );
}
