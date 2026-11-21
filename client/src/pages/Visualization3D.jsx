import {
  AlertTriangle,
  Eye,
  Focus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAnalysis from "../hooks/useAnalysis";
import LoadingSpinner from "../components/LoadingSpinner";
import CodeGraph3D from "../visualization/CodeGraph3D";

const legend = [
  ["healthy", "Healthy"],
  ["warning", "Warning"],
  ["error", "Error"],
  ["unverified", "Unverified"],
];
export default function Visualization3D() {
  const { analysis, analysisId, error, loading } = useAnalysis();
  const [types, setTypes] = useState(new Set(["file", "api"]));
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [impactMode, setImpactMode] = useState(false);
  const [reset, setReset] = useState(0);
  const [focusSignal, setFocusSignal] = useState(0);
  const visibleCount = useMemo(
    () =>
      analysis?.graph.nodes.filter(
        (node) =>
          types.has(node.type) && (status === "all" || node.status === status),
      ).length || 0,
    [analysis, types, status],
  );
  if (loading) return <LoadingSpinner label="Preparing 3D architecture map…" />;
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
  const toggle = (type) =>
    setTypes((current) => {
      const next = new Set(current);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  const related = selected
    ? analysis.graph.links
        .filter(
          (link) => link.source === selected.id || link.target === selected.id,
        )
        .map((link) => {
          const targetId =
            link.source === selected.id ? link.target : link.source;
          const target = analysis.graph.nodes.find(
            (node) => node.id === targetId,
          );
          const apiNode =
            target?.type === "api"
              ? target
              : selected.type === "api"
                ? selected
                : null;
          return {
            direction: link.source === selected.id ? "Outgoing" : "Incoming",
            label:
              target?.type === "api"
                ? `${target.method} ${target.path}`
                : target?.path || target?.label || targetId,
            apiName: apiNode
              ? `${apiNode.method} ${apiNode.path}${apiNode.summary ? ` — ${apiNode.summary}` : ""}`
              : null,
            kind:
              link.kind === "api-reference"
                ? `API connection${link.referenceCount > 1 ? ` · ${link.referenceCount} references` : ""}`
                : "File dependency",
            strength: link.strength || 1,
          };
        })
    : [];
  const impactedIds = new Set();
  const impactedLinks = new Set();
  if (impactMode && selected) {
    const queue = [selected.id];
    while (queue.length) {
      const changedId = queue.shift();
      for (const link of analysis.graph.links) {
        if (link.target !== changedId || impactedIds.has(link.source)) continue;
        impactedIds.add(link.source);
        impactedLinks.add(link);
        queue.push(link.source);
      }
    }
  }
  return (
    <section className="visualization-page">
      <div className="container-fluid px-lg-4">
        <div className="analysis-heading mb-3">
          <div>
            <p className="eyebrow">Interactive visualization</p>
            <h1>{analysis.repository.name} architecture map</h1>
            <p>
              Select a node to inspect it without moving the camera. Drag to
              rotate or pan, and use the scroll wheel to zoom.
              {" "}{visibleCount} nodes currently visible.
            </p>
          </div>
          <Link
            className="btn btn-outline-primary"
            to={`/analysis/${analysisId}`}
          >
            Back to analysis
          </Link>
        </div>
        <div className="visualization-layout">
          <aside className="visual-controls">
            <div className="control-heading">
              <SlidersHorizontal size={17} /> Filters
            </div>
            <label className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={types.has("file")}
                onChange={() => toggle("file")}
              />
              <span className="form-check-label">Files</span>
            </label>
            <label className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={types.has("api")}
                onChange={() => toggle("api")}
              />
              <span className="form-check-label">API endpoints</span>
            </label>
            <hr />
            <label className="form-label small">Status</label>
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              {legend.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className={`btn btn-sm w-100 mt-3 ${impactMode ? "btn-primary" : "btn-outline-primary"}`}
              aria-pressed={impactMode}
              onClick={() => setImpactMode((value) => !value)}
            >
              <Focus size={15} /> {impactMode ? "Impact map on" : "Show change impact"}
            </button>
            {impactMode && (
              <p className="small text-secondary mt-2 mb-0">
                {selected
                  ? `${impactedIds.size} dependent node(s) highlighted. Select a node to change the impact source.`
                  : "Select a file or endpoint to map its downstream impact."}
              </p>
            )}
            <button
              className="btn btn-outline-secondary btn-sm w-100 mt-3"
              onClick={() => {
                setReset((value) => value + 1);
                setSelected(null);
              }}
            >
              <RotateCcw size={15} /> Reset camera
            </button>
            <div className="graph-legend">
              {legend.map(([statusName, label]) => (
                <span key={statusName}>
                  <i className={`legend-dot ${statusName}`} />
                  {label}
                </span>
              ))}
              <span><i className="legend-line api" /> API connection</span>
              <span><i className="legend-line impact" /> Change impact</span>
              <span className="legend-note">Thicker connections = more static API references</span>
            </div>
            <p className="small text-secondary mb-0">
              <AlertTriangle size={14} className="me-1" />
              Red denotes confirmed findings such as a failed API test; it does
              not automatically mark an entire related file as erroneous.
            </p>
          </aside>
          <div className="visual-stage">
            <CodeGraph3D
              graph={analysis.graph}
              nodeTypes={types}
              statusFilter={status}
              selected={selected}
              focusSignal={focusSignal}
              impactMode={impactMode}
              impactedIds={impactedIds}
              impactedLinks={impactedLinks}
              onSelect={setSelected}
              resetSignal={reset}
            />
          </div>
          <aside className="node-details">
            <div className="control-heading">
              <Eye size={17} /> Node details
            </div>
            {selected ? (
              <>
                <span className={`status-badge ${selected.status}`}>
                  {selected.status}
                </span>
                <h2>{selected.label}</h2>
                <p className="path-text">
                  {selected.path || selected.filePath}
                </p>
                <dl>
                  <dt>Type</dt>
                  <dd>
                    {selected.type === "api" ? "API endpoint" : "Source file"}
                  </dd>
                  {selected.language && (
                    <>
                      <dt>Language</dt>
                      <dd>{selected.language}</dd>
                    </>
                  )}
                  {selected.type === "api" && (
                    <>
                      <dt>Method</dt>
                      <dd>{selected.method}</dd>
                      <dt>Endpoint</dt>
                      <dd>{selected.path}</dd>
                    </>
                  )}
                </dl>
                <h3>Connections</h3>
                {impactMode && (
                  <p className="small impact-summary">
                    Change impact: {impactedIds.size} dependent node(s)
                  </p>
                )}
                {related.length ? (
                  <ul className="connection-list">
                    {related.map((item) => (
                      <li key={`${item.direction}-${item.label}`}>
                        <span>{item.direction}</span>
                        {item.label}
                        <small>
                          {item.kind}
                          {item.apiName && ` · ${item.apiName}`}
                          {item.kind === "File dependency" &&
                            ` · strength ${item.strength}`}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-secondary small">
                    No visible static connections.
                  </p>
                )}
                <button
                  className="btn btn-outline-primary btn-sm w-100"
                  onClick={() => setFocusSignal((value) => value + 1)}
                >
                  <Focus size={15} /> Center selected node
                </button>
              </>
            ) : (
              <div className="detail-empty">
                <Eye size={26} />
                <p>
                  Select a node in the map to inspect its incoming and outgoing
                  static connections.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
