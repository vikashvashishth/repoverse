import {
  Bot,
  GitCompareArrows,
  MessageCircleQuestion,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useAnalysis from "../hooks/useAnalysis";
import LoadingSpinner from "../components/LoadingSpinner";
import api, { apiMessage } from "../services/api";

function Answer({ children }) {
  return <div className="ai-answer">{children}</div>;
}

export default function AIAssistant() {
  const { analysis, analysisId, error, loading } = useAnalysis();
  const [searchParams] = useSearchParams();
  const initialIssue = Number(searchParams.get("issue") || 0);
  const [question, setQuestion] = useState("");
  const [issueIndex, setIssueIndex] = useState(
    Number.isInteger(initialIssue) && initialIssue >= 0 ? initialIssue : 0,
  );
  const [baseSha, setBaseSha] = useState("");
  const [headSha, setHeadSha] = useState("");
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  if (loading) return <LoadingSpinner label="Loading AI repository tools…" />;
  if (error || !analysis)
    return (
      <section className="section-pad">
        <div className="container">
          <div className="alert alert-danger">
            {error || "Analysis unavailable."}
          </div>
          <Link to="/import" className="btn btn-primary">Import repository</Link>
        </div>
      </section>
    );

  const run = async (key, endpoint, payload) => {
    setMessage("");
    setBusy(key);
    try {
      const { data } = await api.post(
        `/ai/${endpoint}`,
        { analysisId, ...payload },
        { timeout: 130_000 },
      );
      setAnswers((current) => ({ ...current, [key]: data }));
    } catch (requestError) {
      setMessage(apiMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="section-pad py-4">
      <div className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">AI tools</p>
            <h1>{analysis.repository.name} AI assistant</h1>
            {/* <p>
              Answers are generated with the Gemini API using your server configuration.
            </p> */}
          </div>
          <Link className="btn btn-outline-primary" to={`/analysis/${analysisId}`}>
            Back to analysis
          </Link>
        </div>
        {/* <div className="alert alert-info">
          Relevant repository excerpts are sent to Google when you use these AI tools.
          Excerpts are cached locally for up to one hour.
        </div> */}
        {message && <div className="alert alert-danger">{message}</div>}

        <article className="panel-card mb-4">
          <div className="panel-header">
            <div>
              <h2><MessageCircleQuestion size={20} className="me-2" />Codebase assistant</h2>
              <p>Ask about architecture, files, dependencies, APIs, or implementation details.</p>
            </div>
          </div>
          <form
            className="p-3 pt-0"
            onSubmit={(event) => {
              event.preventDefault();
              run("question", "ask", { question });
            }}
          >
            <label className="form-label" htmlFor="repository-question">Question</label>
            <textarea
              id="repository-question"
              className="form-control"
              rows={3}
              maxLength={2000}
              required
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Where is authentication handled, and how does it protect API routes?"
            />
            <button className="btn btn-primary mt-3" disabled={busy !== ""}>
              {busy === "question" ? "Thinking…" : <><Bot size={16} className="me-1" />Ask repository</>}
            </button>
          </form>
          {answers.question && <Answer>{answers.question.answer}</Answer>}
        </article>

        <article className="panel-card mb-4">
          <div className="panel-header">
            <div>
              <h2><Sparkles size={20} className="me-2" />AI error analyzer</h2>
              <p>Get a contextual explanation and a practical fix for a detected finding.</p>
            </div>
          </div>
          <div className="p-3 pt-0">
            {analysis.issues.length ? (
              <>
                <label className="form-label" htmlFor="issue-select">Detected finding</label>
                <select
                  id="issue-select"
                  className="form-select"
                  value={issueIndex}
                  onChange={(event) => setIssueIndex(Number(event.target.value))}
                >
                  {analysis.issues.map((issue, index) => (
                    <option key={`${issue.filePath}-${issue.type}-${index}`} value={index}>
                      {issue.severity} · {issue.type} · {issue.filePath || "Repository"}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary mt-3"
                  disabled={busy !== ""}
                  onClick={() => run("issue", "explain-error", { issueIndex })}
                >
                  {busy === "issue" ? "Analyzing…" : "Explain selected finding"}
                </button>
                {answers.issue && (
                  <Answer>
                    <strong>{answers.issue.issue.type}: {answers.issue.issue.filePath}</strong>
                    <div className="mt-2">{answers.issue.answer}</div>
                  </Answer>
                )}
              </>
            ) : (
              <p className="text-secondary mb-0">No detected findings to explain.</p>
            )}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-header">
            <div>
              <h2><GitCompareArrows size={20} className="me-2" />Change impact advisor</h2>
              <p>Compare two commits from this public GitHub repository and review likely breakage.</p>
            </div>
          </div>
          <form
            className="p-3 pt-0"
            onSubmit={(event) => {
              event.preventDefault();
              run("impact", "change-impact", { baseSha, headSha });
            }}
          >
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="base-sha">Base commit SHA</label>
                <input
                  id="base-sha"
                  className="form-control"
                  value={baseSha}
                  onChange={(event) => setBaseSha(event.target.value.trim())}
                  pattern="[a-fA-F0-9]{7,40}"
                  minLength={7}
                  maxLength={40}
                  required
                  placeholder="Older commit"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="head-sha">Head commit SHA</label>
                <input
                  id="head-sha"
                  className="form-control"
                  value={headSha}
                  onChange={(event) => setHeadSha(event.target.value.trim())}
                  pattern="[a-fA-F0-9]{7,40}"
                  minLength={7}
                  maxLength={40}
                  required
                  placeholder="Newer commit"
                />
              </div>
            </div>
            <button className="btn btn-primary mt-3" disabled={busy !== ""}>
              {busy === "impact" ? "Comparing commits…" : "Analyze change impact"}
            </button>
          </form>
          {answers.impact && (
            <Answer>
              <p>
                <a href={answers.impact.compareUrl} target="_blank" rel="noreferrer">
                  View GitHub comparison
                </a>
                {" "}· {answers.impact.changedFiles.length} changed file(s)
                {answers.impact.truncated ? " (showing the first 30)" : ""}
              </p>
              <div>{answers.impact.answer}</div>
              {answers.impact.impactedPaths.length > 0 && (
                <div className="mt-3">
                  <strong>Static dependents in this scan</strong>
                  <ul>{answers.impact.impactedPaths.map((filePath) => <li key={filePath}>{filePath}</li>)}</ul>
                </div>
              )}
            </Answer>
          )}
        </article>
        <p className="small text-secondary mt-3">
          AI suggestions are advisory, may be incorrect, and do not execute or verify code.
          GitHub commit comparison requires the commits to be publicly accessible.
        </p>
      </div>
    </section>
  );
}
