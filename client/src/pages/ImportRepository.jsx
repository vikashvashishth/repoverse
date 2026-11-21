import { FileArchive, Github, Info, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  importGithub,
  importZip,
  configureRepositoryWebhook,
} from "../services/repositoryService";
import { apiMessage } from "../services/api";

export default function ImportRepository() {
  const [url, setUrl] = useState("");
  const [archive, setArchive] = useState(null);
  const [mode, setMode] = useState("github");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!url)
      return setError(
        "Enter the public GitHub URL used to identify this repository.",
      );
    if (mode === "zip" && !archive) return setError("Choose a ZIP archive.");
    setBusy(true);
    try {
      const { data } =
        mode === "github"
          ? await importGithub(url)
          : await importZip(url, archive);
      if (mode === "github" && webhookSecret) {
        await configureRepositoryWebhook(url, webhookSecret);
        setWebhookSecret("");
      }
      sessionStorage.setItem(
        "repoverse-last-analysis",
        JSON.stringify({
          id: data.analysisId,
          repository: data.analysis.repository,
          stats: data.analysis.stats,
        }),
      );
      navigate(`/analysis/${data.analysisId}`, {
        state: { analysis: data.analysis },
      });
    } catch (err) {
      setError(apiMessage(err, "The repository could not be analyzed."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="section-pad">
      <div className="container narrow-wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Repository import</p>
            <h1>Start a safe static analysis.</h1>
            <p>
              Use a public GitHub URL or pair a repository ZIP with its GitHub
              identity.
            </p>
          </div>
        </div>
        <div className="import-card">
          <div className="import-tabs">
            <button
              className={mode === "github" ? "active" : ""}
              onClick={() => setMode("github")}
            >
              <Github size={18} /> Public GitHub URL
            </button>
            <button
              className={mode === "zip" ? "active" : ""}
              onClick={() => setMode("zip")}
            >
              <FileArchive size={18} /> ZIP upload
            </button>
          </div>
          {error && <div className="alert alert-danger mt-4">{error}</div>}
          <form onSubmit={submit} className="mt-4">
            <label className="form-label" htmlFor="repository-url">
              GitHub repository URL
            </label>
            <input
              className="form-control form-control-lg"
              id="repository-url"
              placeholder="https://github.com/username/repository"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={busy}
            />
            {mode === "zip" && (
              <>
                <label className="form-label mt-4" htmlFor="archive">
                  Repository ZIP archive
                </label>
                <input
                  className="form-control"
                  id="archive"
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(event) =>
                    setArchive(event.target.files?.[0] || null)
                  }
                  disabled={busy}
                />
                <p className="form-text">
                  Maximum upload: 25 MB. It will be discarded after analysis.
                </p>
              </>
            )}
            {mode === "github" && (
              <>
                <label className="form-label mt-4" htmlFor="webhook-secret">
                  GitHub webhook secret (optional)
                </label>
                <input
                  className="form-control"
                  id="webhook-secret"
                  type="password"
                  minLength={16}
                  placeholder="At least 16 characters"
                  value={webhookSecret}
                  onChange={(event) => setWebhookSecret(event.target.value)}
                  disabled={busy}
                />
                <p className="form-text">
                  The secret is encrypted at rest and is never returned to this page.
                </p>
              </>
            )}
            <button className="btn btn-primary mt-4" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Inspecting repository…
                </>
              ) : (
                <>
                  {mode === "github" ? (
                    <Github size={18} />
                  ) : (
                    <Upload size={18} />
                  )}{" "}
                  Analyze Repository
                </>
              )}
            </button>
          </form>
          <div className="import-notice">
            <Info size={18} />
            <span>
              RepoVerse never executes imported code. It excludes common
              dependency and build folders, limits archive extraction, and
              cleans up temporary source files after the scan.
            </span>
          </div>
          <div className="import-notice mt-3">
            <Github size={18} />
            <span>
              Automatic updates require GitHub webhook setup and are not granted by importing.
              In the GitHub repository, open Settings → Webhooks → Add webhook, use the
              RepoVerse webhook URL shown after connecting, select application/json and
              the push event, and enter a secret of at least 16 characters.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
