import { Link } from "react-router-dom";
import {
  Boxes,
  Braces,
  Bug,
  ChevronRight,
  Code2,
  Cuboid,
  FileSearch,
  GitBranch,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    icon: <Cuboid />,
    title: "Architecture in 3D",
    text: "Explore static file dependencies as a navigable architecture map.",
  },
  {
    icon: <GitBranch />,
    title: "Dependency tracing",
    text: "Follow relative imports, exports, missing paths, and detectable cycles.",
  },
  {
    icon: <Braces />,
    title: "API awareness",
    text: "Read documented OpenAPI endpoints and test permitted public targets.",
  },
  {
    icon: <Bug />,
    title: "Actionable issues",
    text: "Keep repository-specific error history with stable fingerprints.",
  },
];
export default function Home() {
  const { user } = useAuth();
  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-lg-7">
              <p className="eyebrow">
                <Waypoints size={16} /> Code architecture, made legible
              </p>
              <h1>
                Understand Your Codebase in a <span>Whole New Dimension.</span>
              </h1>
              <p className="hero-copy">
                Visualize file dependencies, explore API connections, detect
                potential issues, and understand your software architecture
                through interactive 3D visualization.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link
                  to={user ? "/import" : "/signup"}
                  className="btn btn-primary btn-lg"
                >
                  Explore Your Repository <ChevronRight size={18} />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn btn-outline-primary btn-lg"
                >
                  Learn More
                </a>
              </div>
              <p className="small text-secondary mt-4 mb-0">
                <ShieldCheck size={15} className="me-1 text-success" />
                Repositories are analyzed as files; RepoVerse never runs
                imported code.
              </p>
            </div>
            <div className="col-lg-5">
              <div
                className="architecture-preview"
                aria-label="Illustrative architecture graph"
              >
                <div className="preview-grid" />
                {[
                  ["a", "src/App.jsx"],
                  ["b", "authService.js"],
                  ["c", "api.js"],
                  ["d", "GET /users"],
                ].map(([key, label]) => (
                  <div className={`preview-node node-${key}`} key={key}>
                    <Code2 size={14} />
                    {label}
                  </div>
                ))}
                <i className="preview-link link-ab" />
                <i className="preview-link link-bc" />
                <i className="preview-link link-cd" />
                <div className="preview-caption">
                  <Boxes size={16} /> static dependency view
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="section-pad bg-soft">
        <div className="container">
          <div className="section-intro">
            <p className="eyebrow">Built for practical investigations</p>
            <h2>See the paths that matter</h2>
            <p>
              RepoVerse focuses on observable static relationships. It keeps
              uncertainty visible instead of guessing at runtime behavior.
            </p>
          </div>
          <div className="row g-4">
            {features.map((feature) => (
              <div className="col-md-6 col-xl-3" key={feature.title}>
                <article className="feature-card">
                  <span className="feature-icon">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="how-it-works" className="section-pad">
        <div className="container">
          <div className="section-intro">
            <p className="eyebrow">A focused workflow</p>
            <h2>From repository to a clearer model</h2>
          </div>
          <div className="row g-4">
            {[
              [
                "01",
                "Import safely",
                "Provide a public GitHub URL or upload a ZIP tied to its GitHub identity.",
              ],
              [
                "02",
                "Inspect the scan",
                "Review files, languages, static imports, documented APIs, and analysis warnings.",
              ],
              [
                "03",
                "Trace and act",
                "Navigate a 3D graph, test configured public endpoints, and track issue status over time.",
              ],
            ].map(([number, title, text]) => (
              <div className="col-md-4" key={number}>
                <article className="step-card">
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section-pad bg-soft">
        <div className="container">
          <div className="row align-items-center gy-4">
            <div className="col-lg-6">
              <p className="eyebrow">Designed around real source files</p>
              <h2>Made for JavaScript and TypeScript first.</h2>
              <p className="text-secondary mb-0">
                The analyzer parses JavaScript and TypeScript source, uses
                documented API specifications when present, and records only
                account information and historical error records in MongoDB.
              </p>
            </div>
            <div className="col-lg-6">
              <div className="tech-list">
                <span>React</span>
                <span>Three.js</span>
                <span>Express</span>
                <span>MongoDB</span>
                <span>Babel</span>
                <span>TypeScript</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
