import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Filter,
  History,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import api, { apiMessage } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

const initialFilters = {
  repoUrl: "",
  status: "",
  severity: "",
  q: "",
  from: "",
  to: "",
};
export default function RepositoryHistory() {
  const [repositories, setRepositories] = useState(null);
  const [errors, setErrors] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const loadRepositories = () =>
    api
      .get("/errors/repositories")
      .then(({ data }) => {
        if (!Array.isArray(data.repositories))
          throw new Error("The repository history response was invalid.");
        setRepositories(data.repositories);
      })
      .catch((err) => setMessage(apiMessage(err)))
      .finally(() => setRepositories((current) => current ?? []));
  const loadErrors = () => {
    setErrors(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    api
      .get(`/errors?${params}`)
      .then(({ data }) => {
        if (
          !Array.isArray(data.errors) ||
          !data.pagination ||
          data.errors.some((item) => !item || typeof item !== "object")
        ) {
          throw new Error("The historical errors response was invalid.");
        }
        setErrors({
          ...data,
          errors: data.errors.map((item) => ({
            ...item,
            severity: typeof item.severity === "string" ? item.severity : "Low",
            status: typeof item.status === "string" ? item.status : "Open",
          })),
        });
      })
      .catch((err) => {
        setMessage(apiMessage(err));
        setErrors({ errors: [], pagination: { page: 1, pages: 0, total: 0 } });
      });
  };
  useEffect(() => {
    loadRepositories();
  }, []);
  useEffect(() => {
    loadErrors();
  }, [page, filters]);
  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const setStatus = async (id, status) => {
    setBusy(id);
    setMessage("");
    try {
      await api.patch(`/errors/${id}/status`, { status });
      loadErrors();
      loadRepositories();
    } catch (err) {
      setMessage(apiMessage(err));
    } finally {
      setBusy("");
    }
  };
  const remove = async (id) => {
    if (
      !window.confirm(
        "Delete this historical error record? This cannot be undone.",
      )
    )
      return;
    setBusy(id);
    try {
      await api.delete(`/errors/${id}`);
      loadErrors();
      loadRepositories();
    } catch (err) {
      setMessage(apiMessage(err));
    } finally {
      setBusy("");
    }
  };
  const removeRepo = async () => {
    if (
      !filters.repoUrl ||
      !window.confirm(
        "Delete all historical errors for this repository? This cannot be undone.",
      )
    )
      return;
    setBusy("repository");
    try {
      const { data } = await api.delete("/errors", {
        data: { repoUrl: filters.repoUrl },
      });
      setMessage(`${data.deletedCount} historical error record(s) deleted.`);
      updateFilter("repoUrl", "");
      loadRepositories();
    } catch (err) {
      setMessage(apiMessage(err));
    } finally {
      setBusy("");
    }
  };
  const selectedRepo = repositories?.find(
    (repo) => repo.repoUrl === filters.repoUrl,
  );
  return (
    <section className="section-pad history-page">
      <div className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Repository history</p>
            <h1>Historical error records</h1>
            <p>
              Records are grouped by normalized GitHub URL and are visible only
              to your account.
            </p>
          </div>
        </div>
        {message && (
          <div
            className={`alert ${message.includes("deleted") ? "alert-success" : "alert-danger"} d-flex justify-content-between align-items-center`}
          >
            {message}
            <button className="btn-close" onClick={() => setMessage("")} />
          </div>
        )}
        <div className="row g-4">
          <div className="col-lg-4">
            <article className="panel-card repository-list">
              <div className="panel-header">
                <div>
                  <h2>Your repositories</h2>
                  <p>{repositories?.length || 0} with saved findings</p>
                </div>
                <History />
              </div>
              {repositories === null ? (
                <LoadingSpinner />
              ) : repositories.length ? (
                <div>
                  {repositories.map((repo) => (
                    <button
                      className={`history-repo ${filters.repoUrl === repo.repoUrl ? "active" : ""}`}
                      key={repo.repoUrl}
                      onClick={() =>
                        updateFilter(
                          "repoUrl",
                          filters.repoUrl === repo.repoUrl ? "" : repo.repoUrl,
                        )
                      }
                    >
                      <strong>{repo.repoName}</strong>
                      <span>{repo.repoUrl.replace("https://", "")}</span>
                      <small>
                        {repo.openErrors} open · {repo.totalErrors} total
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <History size={25} />
                  <h3>Nothing saved yet</h3>
                  <p>
                    Imported scans that find issues will build your history
                    here.
                  </p>
                </div>
              )}
            </article>
          </div>
          <div className="col-lg-8">
            <div className="filter-panel">
              <div className="d-flex align-items-center gap-2">
                <Filter size={17} />
                <strong>Filter records</strong>
              </div>
              <div className="filter-grid">
                <div>
                  <label className="form-label">Search</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <Search size={15} />
                    </span>
                    <input
                      className="form-control"
                      placeholder="File path or error type"
                      value={filters.q}
                      onChange={(event) =>
                        updateFilter("q", event.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={filters.status}
                    onChange={(event) =>
                      updateFilter("status", event.target.value)
                    }
                  >
                    <option value="">All statuses</option>
                    <option>Open</option>
                    <option>Resolved</option>
                    <option>Ignored</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Severity</label>
                  <select
                    className="form-select"
                    value={filters.severity}
                    onChange={(event) =>
                      updateFilter("severity", event.target.value)
                    }
                  >
                    <option value="">All severities</option>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Detected after</label>
                  <input
                    className="form-control"
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      updateFilter("from", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="form-label">Detected before</label>
                  <input
                    className="form-control"
                    type="date"
                    value={filters.to}
                    onChange={(event) => updateFilter("to", event.target.value)}
                  />
                </div>
              </div>
              {Object.values(filters).some(Boolean) && (
                <button
                  className="btn btn-link btn-sm px-0 mt-2"
                  onClick={() => {
                    setPage(1);
                    setFilters(initialFilters);
                  }}
                >
                  <X size={14} /> Clear filters
                </button>
              )}
            </div>
            {selectedRepo && (
              <div className="selected-repo-header">
                <div>
                  <strong>{selectedRepo.repoName}</strong>
                  <span>{selectedRepo.repoUrl}</span>
                </div>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={removeRepo}
                  disabled={busy === "repository"}
                >
                  <Trash2 size={14} /> Delete repository history
                </button>
              </div>
            )}
            {errors === null ? (
              <LoadingSpinner label="Loading historical errors…" />
            ) : errors.errors.length ? (
              <div className="history-errors">
                {errors.errors.map((item) => (
                  <article className="history-error" key={item._id}>
                    <div>
                      <span
                        className={`severity ${item.severity.toLowerCase()}`}
                      >
                        {item.severity}
                      </span>
                      <span
                        className={`history-status ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h2>{item.errorType}</h2>
                    <p>{item.errorMessage}</p>
                    <code>
                      {item.filePath}
                      {item.lineNumber ? `:${item.lineNumber}` : ""}
                    </code>
                    <div className="history-meta">
                      <span>
                        First seen{" "}
                        {new Date(item.firstDetectedAt).toLocaleDateString()}
                      </span>
                      <span>
                        Last seen{" "}
                        {new Date(item.lastDetectedAt).toLocaleDateString()}
                      </span>
                      <span>
                        {item.occurrenceCount} occurrence
                        {item.occurrenceCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="history-actions">
                      <select
                        className="form-select form-select-sm"
                        value={item.status}
                        disabled={busy === item._id}
                        onChange={(event) =>
                          setStatus(item._id, event.target.value)
                        }
                      >
                        <option>Open</option>
                        <option>Resolved</option>
                        <option>Ignored</option>
                      </select>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={busy === item._id}
                        onClick={() => remove(item._id)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CircleDot size={27} />
                <h3>No matching history</h3>
                <p>
                  Try adjusting the filters, or import a repository to begin
                  tracking discovered issues.
                </p>
              </div>
            )}
            {errors?.pagination?.pages > 1 && (
              <nav className="history-pagination">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span>
                  Page {errors.pagination.page} of {errors.pagination.pages} ·{" "}
                  {errors.pagination.total} records
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= errors.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
