import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock3,
  FileCode2,
  FolderSearch,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { apiMessage } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Dashboard() {
  const { user } = useAuth();
  const [repos, setRepos] = useState(null);
  const [connections, setConnections] = useState([]);
  const [syncing, setSyncing] = useState("");
  const [error, setError] = useState("");
  const session = JSON.parse(
    sessionStorage.getItem("repoverse-last-analysis") || "null",
  );
  useEffect(() => {
    api
      .get("/errors/repositories")
      .then(({ data }) => setRepos(data.repositories))
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setRepos((current) => current ?? []));
    api
      .get("/repositories/connections")
      .then(({ data }) => setConnections(Array.isArray(data.repositories) ? data.repositories : []))
      .catch(() => setConnections([]));
  }, []);
  const syncNow = async (repoUrl) => {
    setSyncing(repoUrl);
    setError("");
    try {
      await api.post("/repositories/sync", { url: repoUrl });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSyncing("");
    }
  };
  const open = repos?.reduce((count, repo) => count + repo.openErrors, 0) || 0;
  return (
    <section className="dashboard-page">
      <div className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Welcome back, {user.fullName.split(" ")[0]}.</h1>
            <p>Import a repository or continue a current session.</p>
          </div>
          <Link className="btn btn-primary" to="/import">
            <FolderSearch size={18} /> Import Repository
          </Link>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="row g-3 mb-5">
          <div className="col-md-4">
            <div className="metric-card">
              <FileCode2 />
              <div>
                <span>Files in current session</span>
                <strong>{session?.stats?.totalFiles || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="metric-card">
              <AlertTriangle />
              <div>
                <span>Open historical issues</span>
                <strong>{open}</strong>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="metric-card">
              <History />
              <div>
                <span>Repositories with history</span>
                <strong>{repos?.length || 0}</strong>
              </div>
            </div>
          </div>
        </div>
        {session && (
          <div className="session-callout">
            <div>
              <Boxes />
              <div>
                <strong>Current analysis: {session.repository.name}</strong>
                <span>
                  {session.stats.dependencyCount} static dependencies ·{" "}
                  {session.stats.endpointCount} documented API endpoints
                </span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Link
                className="btn btn-outline-primary"
                to={`/analysis/${session.id}`}
              >
                Open Analysis <ArrowRight size={17} />
              </Link>
              <Link
                className="btn btn-outline-primary"
                to={`/visualization/${session.id}`}
              >
                Open 3D visualization <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        )}
        <div className="section-row">
          <div>
            <h2>Recently analyzed repositories</h2>
            <p>Actual repository history from your account.</p>
          </div>
          <Link to="/history">View full history</Link>
        </div>
        {repos === null ? (
          <LoadingSpinner />
        ) : repos.length ? (
          <div className="row g-3">
            {repos.slice(0, 4).map((repo) => (
              <div className="col-md-6" key={repo.repoUrl}>
                <article className="repo-card">
                  <div className="repo-icon">
                    <Clock3 size={18} />
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <h3>{repo.repoName}</h3>
                    <a href={repo.repoUrl} target="_blank" rel="noreferrer">
                      {repo.repoUrl.replace("https://", "")}
                    </a>
                    <p>
                      <span>{repo.totalErrors} tracked</span>
                      <span>{repo.openErrors} open</span>
                    </p>
                    {connections.find((item) => item.repoUrl === repo.repoUrl) && (() => {
                      const connection = connections.find((item) => item.repoUrl === repo.repoUrl);
                      return (
                        <p>
                          <span>{connection.syncStatus}</span>
                          <span>
                            {connection.webhookVerified
                              ? "Automatic updates enabled"
                              : "Automatic updates not enabled"}
                          </span>
                          {connection.lastAnalyzedSha && (
                            <span>Commit {connection.lastAnalyzedSha.slice(0, 7)}</span>
                          )}
                          {connection.latestCommitDate && (
                            <span>
                              Latest commit{" "}
                              {new Date(connection.latestCommitDate).toLocaleString()}
                            </span>
                          )}
                          {connection.lastSuccessfulAnalysisAt && (
                            <span>
                              Last success{" "}
                              {new Date(connection.lastSuccessfulAnalysisAt).toLocaleString()}
                            </span>
                          )}
                          <span>{connection.newErrors || 0} new errors</span>
                          <span>{connection.resolvedErrors || 0} resolved</span>
                          <button
                            className="btn btn-sm btn-outline-primary mt-2"
                            disabled={syncing === repo.repoUrl || connection.syncStatus === "Analyzing"}
                            onClick={() => syncNow(repo.repoUrl)}
                          >
                            {syncing === repo.repoUrl ? "Syncing…" : "Sync Now"}
                          </button>
                        </p>
                      );
                    })()}
                  </div>
                </article>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <History size={28} />
            <h3>No repository history yet</h3>
            <p>
              Once an analysis finds issues, they will appear here under their
              normalized GitHub URL.
            </p>
            <Link className="btn btn-outline-primary" to="/import">
              Import a repository
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
