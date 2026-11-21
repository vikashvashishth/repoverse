import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="footer mt-auto">
      <div className="container d-flex flex-column flex-md-row justify-content-between gap-3">
        <div>
          <strong>RepoVerse 3D</strong>
          <p className="mb-0 small">
            Static architecture analysis for safer code exploration.
          </p>
        </div>
        <div className="d-flex gap-3 small">
          <Link to="/about">About</Link>
          
        </div>
      </div>
    </footer>
  );
}
