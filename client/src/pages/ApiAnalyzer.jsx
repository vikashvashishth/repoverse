import {
  Activity,
  CheckCircle2,
  FlaskConical,
  Globe2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import useAnalysis from "../hooks/useAnalysis";
import LoadingSpinner from "../components/LoadingSpinner";
import api, { apiMessage } from "../services/api";

export default function ApiAnalyzer() {
  const { analysis, analysisId, error, loading } = useAnalysis();
  const [baseUrl, setBaseUrl] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(null);
  const [message, setMessage] = useState("");
  const [inspection, setInspection] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [authorizeWrite, setAuthorizeWrite] = useState(false);
  if (loading) return <LoadingSpinner label="Loading API connections…" />;
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
  const executeTest = async (target, method, endpoint = null) => {
    let parsedBody;
    if (["POST", "PUT", "PATCH"].includes(method) && requestBody.trim()) {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        setMessage("Request body must be valid JSON.");
        return;
      }
    }
    try {
      const { data } = await api.post("/apis/test", {
        analysisId,
        endpointId: endpoint?.id,
        targetUrl: target.trim(),
        method,
        requestBody: parsedBody,
        responseSchemas: endpoint?.responseSchemas,
      });
      setResult({
        endpoint: endpoint || { method, path: target.trim() },
        target: target.trim(),
        ...data,
      });
    } catch (err) {
      setMessage(apiMessage(err));
    }
  };
  const inspectAndTest = async (event) => {
    event.preventDefault();
    setMessage("");
    setResult(null);
    setInspection(null);
    setSelectedMethod("");
    setAuthorizeWrite(false);
    if (!baseUrl.trim()) {
      setMessage("Enter a complete public http(s) API URL to inspect.");
      return;
    }
    setTesting("inspect");
    try {
      const { data } = await api.post(
        "/apis/inspect",
        {
          analysisId,
          targetUrl: baseUrl.trim(),
        },
        { timeout: 70000 },
      );
      setInspection(data);
      const safeMethod = ["GET", "HEAD", "OPTIONS"].find((method) =>
        data.methods.includes(method),
      );
      if (safeMethod) {
        const method = safeMethod;
        setSelectedMethod(method);
        const endpoint = data.endpoints.find((item) => item.method === method);
        await executeTest(data.targetUrl, method, endpoint);
      } else if (data.methods.length === 1) {
        setSelectedMethod(data.methods[0]);
      }
    } catch (err) {
      setMessage(apiMessage(err));
    } finally {
      setTesting(null);
    }
  };
  const testDetectedMethod = async () => {
    const endpoint = inspection?.endpoints.find(
      (item) => item.method === selectedMethod,
    );
    if (!inspection || !selectedMethod) return;
    if (!["GET", "HEAD", "OPTIONS"].includes(selectedMethod) && !authorizeWrite) {
      setMessage("Confirm that you authorize this state-changing request before testing it.");
      return;
    }
    setMessage("");
    setResult(null);
    setTesting("direct-test");
    try {
      await executeTest(inspection.targetUrl, selectedMethod, endpoint);
    } finally {
      setTesting(null);
    }
  };
  const test = (endpoint) => {
    if (!baseUrl.trim())
      return setMessage("Enter a public API base URL before testing an endpoint.");
    let target;
    try {
      target = new URL(
        endpoint.path,
        baseUrl.trim().endsWith("/")
          ? baseUrl.trim()
          : `${baseUrl.trim()}/`,
      ).toString();
    } catch {
      return setMessage("Enter a complete public http(s) base URL.");
    }
    setMessage("");
    setResult(null);
    setTesting(endpoint.id);
    executeTest(target, endpoint.method, endpoint).finally(() => setTesting(null));
  };
  const writeMethod =
    selectedMethod && !["GET", "HEAD", "OPTIONS"].includes(selectedMethod);
  return (
    <section className="section-pad">
      <div className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">API connection analyzer</p>
            <h1>API analyzer</h1>
            <p>
              Enter a public API URL. The backend checks its supported request
              methods, then tests a detected safe method.
            </p>
          </div>
          <Link
            className="btn btn-outline-primary"
            to={`/analysis/${analysisId}`}
          >
            Back to analysis
          </Link>
        </div>
        <div className="api-config">
          <Globe2 />
          <form className="flex-grow-1" onSubmit={inspectAndTest}>
            <label className="form-label" htmlFor="base-url">
              Public API URL
            </label>
            <input
              id="base-url"
              className="form-control"
              type="url"
              required
              placeholder="https://api.example.com/items/123"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setInspection(null);
                setSelectedMethod("");
                setAuthorizeWrite(false);
                setMessage("");
                setResult(null);
              }}
            />
            <button
              className="btn btn-primary btn-sm mt-2"
              type="submit"
              disabled={testing !== null}
            >
              {testing === "inspect" ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Inspecting API…
                </>
              ) : (
                <>
                  <Globe2 size={15} className="me-1" />
                  Inspect API
                </>
              )}
            </button>
            <span className="small text-secondary ms-2">
              Checks OPTIONS and documented methods.
            </span>
          </form>
        </div>
        {message && <div className="alert alert-danger mt-3">{message}</div>}
        {inspection && (
          <div className="panel-card mt-3">
            <div className="panel-header">
              <div>
                <h2>API inspection</h2>
                <p className="mb-1">
                  {inspection.methods.length
                    ? `Detected by ${inspection.source === "openapi-and-options" ? "OpenAPI and OPTIONS" : inspection.source === "openapi" ? "the repository's OpenAPI specification" : "the API OPTIONS response"} (HTTP ${inspection.optionsStatus}).`
                    : inspection.message}
                </p>
                {inspection.methods.length > 0 && (
                  <p className="small text-secondary mb-1">
                    {["GET", "HEAD", "OPTIONS"].some((method) =>
                      inspection.methods.includes(method),
                    )
                      ? "A safe method was tested automatically. Choose another detected method below if needed."
                      : "A state-changing method was detected; authorize it below before testing."}
                  </p>
                )}
                {inspection.methods.length > 0 && (
                  <p className="mb-0">
                    Supported methods:{" "}
                    {inspection.methods.map((method) => (
                      <span className="method ms-1" key={method}>{method}</span>
                    ))}
                  </p>
                )}
              </div>
            </div>
            {inspection.methods.length > 0 && (
              <div className="p-3 pt-0">
                {inspection.methods.length > 1 && (
                  <>
                    <label className="form-label" htmlFor="detected-method">
                      Choose a request method
                    </label>
                    <select
                      id="detected-method"
                      className="form-select mb-3"
                      value={selectedMethod}
                      onChange={(event) => {
                        setSelectedMethod(event.target.value);
                        setAuthorizeWrite(false);
                      }}
                    >
                      <option value="">Select detected method…</option>
                      {inspection.methods.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </>
                )}
                {["POST", "PUT", "PATCH"].includes(selectedMethod) && (
                  <>
                    <label className="form-label" htmlFor="request-body">
                      JSON request body (optional)
                    </label>
                    <textarea
                      id="request-body"
                      className="form-control mb-2"
                      rows={3}
                      placeholder={'{"name":"Updated value"}'}
                      value={requestBody}
                      onChange={(event) => setRequestBody(event.target.value)}
                    />
                  </>
                )}
                {writeMethod && (
                  <label className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={authorizeWrite}
                      onChange={(event) => setAuthorizeWrite(event.target.checked)}
                    />
                    <span className="form-check-label">
                      I authorize sending this state-changing request to the API.
                    </span>
                  </label>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={
                    testing !== null ||
                    !selectedMethod ||
                    (writeMethod && !authorizeWrite)
                  }
                  onClick={testDetectedMethod}
                >
                  {testing === "direct-test" ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Testing {selectedMethod}…
                    </>
                  ) : (
                    <>
                      <FlaskConical size={15} className="me-1" />
                      Test {selectedMethod || "detected method"}
                    </>
                  )}
                </button>
                {inspection.endpoints.some((endpoint) => endpoint.method === selectedMethod) && (
                  <span className="small text-secondary ms-2">
                    Using documented endpoint contract and response schema.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {result && (
          <div className={`api-result ${result.ok ? "success" : "failure"}`}>
            {result.ok ? <CheckCircle2 /> : <XCircle />}
            <div>
              <strong>
                {result.endpoint.method} {result.endpoint.path}
              </strong>
              <p className="mb-0">
                {result.status == null
                  ? "No HTTP response"
                  : `HTTP ${result.status} · ${result.responseTimeMs} ms · ${result.contentType || "unknown response format"}`}
              </p>
              {result.error && <p className="small mb-0 mt-1">{result.error}</p>}
              <p className="small mb-0 mt-1">URL: {result.target}</p>
              {result.schemaValidation && (
                <p className="small mb-0 mt-1">{result.schemaValidation}</p>
              )}
            </div>
          </div>
        )}
        <div className="panel-card mt-4">
          <div className="panel-header">
            <div>
              <h2>Discovered specification endpoints</h2>
              <p>
                {analysis.endpoints.length
                  ? `${analysis.endpoints.length} endpoint(s) from repository specifications.`
                  : "No OpenAPI or Swagger endpoints were found in this scan."}
              </p>
            </div>
          </div>
          {analysis.endpoints.length ? (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Summary</th>
                    <th>Specification file</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {analysis.endpoints.map((endpoint) => (
                    <tr key={endpoint.id}>
                      <td>
                        <span
                          className={`method ${endpoint.method.toLowerCase()}`}
                        >
                          {endpoint.method}
                        </span>
                      </td>
                      <td>
                        <code>{endpoint.path}</code>
                      </td>
                      <td>
                        {endpoint.summary || (
                          <span className="text-secondary">No summary</span>
                        )}
                      </td>
                      <td className="small text-secondary">
                        {endpoint.filePath}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          disabled={testing !== null}
                          onClick={() => test(endpoint)}
                        >
                          {testing === endpoint.id ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <>
                              <FlaskConical size={15} /> Test
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state compact">
              <Activity size={27} />
              <h3>No API specification found</h3>
              <p>
                Add a valid OpenAPI or Swagger JSON/YAML file to make endpoint
                discovery available.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
