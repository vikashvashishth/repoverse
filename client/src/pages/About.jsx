import { CheckCircle2, Shield, Telescope } from "lucide-react";
export default function About() {
  return (
    <section className="section-pad py-4">
      <div className="container narrow">
        <p className="eyebrow">About RepoVerse 3D</p>
        <h1 className="page-title">
          Architecture inspection without the guesswork.
        </h1>
        <p className="lead text-secondary">
          RepoVerse 3D is a developer tool for understanding static code
          relationships. It makes a clear distinction between what source
          analysis can establish and what needs runtime evidence.
        </p>
        <div className="row g-4 mt-2">
          <div className="col-md-4">
            <article className="info-card">
              <Telescope />
              <h3>What it sees</h3>
              <p>
                Files, folders, imports, exports, selected parser diagnostics,
                static dependency cycles, and documented OpenAPI endpoints.
              </p>
            </article>
          </div>
          <div className="col-md-4">
            <article className="info-card">
              <Shield />
              <h3>What it protects</h3>
              <p>
                Imported projects are never executed. Archives have path and
                size limits, and internal API network targets are rejected.
              </p>
            </article>
          </div>
          <div className="col-md-4">
            <article className="info-card">
              <CheckCircle2 />
              <h3>What it records</h3>
              <p>
                MongoDB stores user accounts and repository-scoped historical
                issues only—not complete repositories or uploads. Bounded source
                excerpts for self-hosted AI are cached locally for up to one hour.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
