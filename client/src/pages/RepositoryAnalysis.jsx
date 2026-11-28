import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Box,
  Braces,
  ChevronRight,
  FileCode2,
  FileWarning,
  Network,
  Route,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import useAnalysis from "../hooks/useAnalysis";
import LoadingSpinner from "../components/LoadingSpinner";
import FileExplorer from "../components/FileExplorer";

export default function RepositoryAnalysis() {
  const { analysis, analysisId, error, loading } = useAnalysis();
  const [selected, setSelected] = useState(null);
  if (loading) return <LoadingSpinner label="Loading repository analysis…" />;
  if (error || !analysis)
    return (
      <section className="section-pad">
        <div className="container">
          <div className="alert alert-danger">
            {error || "Analysis unavailable."}
          </div>
          <Link to="/import" className="btn btn-primary">
            Import repository
          </Link>
        </div>
      </section>
    );
  const { repository, stats } = analysis;
  return (
    <section className="analysis-page py-4">
      <div className="container-fluid px-lg-4">
        <div className="analysis-heading">
          <div>
            <p className="eyebrow">Repository analysis</p>
            <h1>{repository.name}</h1>
            <a href={repository.url} target="_blank" rel="noreferrer">
              {repository.url.replace("https://", "")}
            </a>
          </div>
          <div className="analysis-actions">
            <Link
              className="btn btn-outline-primary"
              to={`/reports/${analysisId}`}
            >
              Download Report
            </Link>
            <Link
              className="btn btn-primary"
              to={`/visualization/${analysisId}`}
            >
              <Box size={18} />
              Open 3D Map
            </Link>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[
            [<FileCode2 />, "Files analyzed", stats.totalFiles],
            [<Network />, "Static dependencies", stats.dependencyCount],
            [<Route />, "Documented endpoints", stats.endpointCount],
            [<FileWarning />, "Issues & warnings", stats.issueCount],
          ].map(([icon, label, value]) => (
            <div className="col-6 col-lg-3" key={label}>
              <div className="analysis-stat">
                {icon}
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </div>
        <p className="analysis-disclaimer">
          <AlertTriangle size={16} />
          This view reflects static analysis. Imports and API references
          discovered here may not represent every runtime dependency.
        </p>
        <div className="row g-4">
          <div className="col-xl-4">
            <article className="panel-card h-100">
              <div className="panel-header">
                <div>
                  <h2>File explorer</h2>
                  <p>
                    {analysis.languages
                      .map((language) => `${language.name} (${language.count})`)
                      .join(" · ") || "No recognized source languages found"}
                  </p>
                </div>
              </div>
              <FileExplorer
                tree={analysis.tree}
                files={analysis.files}
                selectedPath={selected?.path}
                onSelect={setSelected}
              />
            </article>
          </div>
          <div className="col-xl-8">
            <article className="panel-card h-100">
              <div className="panel-header">
                <div>
                  <h2>{selected ? selected.label : "Repository overview"}</h2>
                  <p>
                    {selected
                      ? selected.path
                      : "Select a source file to inspect static metadata."}
                  </p>
                </div>
                {selected && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSelected(null)}
                  >
                    Clear
                  </button>
                )}
              </div>
              {selected ? (
                <div className="metadata-view">
                  <div>
                    <span>Language</span>
                    <strong>{selected.language}</strong>
                  </div>
                  <div>
                    <span>Size</span>
                    <strong>{selected.size.toLocaleString()} bytes</strong>
                  </div>
                  <div>
                    <span>Static imports</span>
                    <strong>{selected.imports.length}</strong>
                  </div>
                  <div>
                    <span>Exports</span>
                    <strong>
                      {selected.exports.length || "None detected"}
                    </strong>
                  </div>
                  <div className="wide">
                    <span>Imported modules</span>
                    {selected.imports.length ? (
                      <ul>
                        {selected.imports.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No static imports detected.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overview-grid">
                  <div>
                    <Braces />
                    <h3>Dependency graph</h3>
                    <p>
                      Navigate file-to-file import relationships and detect
                      missing paths or circular links.
                    </p>
                    <Link to={`/visualization/${analysisId}`}>
                      Explore visualization <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div>
                    <FileWarning />
                    <h3>Issue review</h3>
                    <p>
                      Inspect parser diagnostics, static dependency warnings,
                      and selected lint results.
                    </p>
                    <Link to={`/issues/${analysisId}`}>
                      View issues <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div>
                    <Route />
                    <h3>API connections</h3>
                    <p>
                      Review documented OpenAPI endpoints and test allowed
                      public API targets.
                    </p>
                    <Link to={`/apis/${analysisId}`}>
                      Open API analyzer <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div>
                    <Bot />
                    <h3>AI assistant</h3>
                    <p>
                      Ask questions about this codebase, explain findings, or
                      compare commits for likely impact.
                    </p>
                    <Link to={`/ai/${analysisId}`}>
                      Open AI tools <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
