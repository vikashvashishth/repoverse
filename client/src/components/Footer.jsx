import { Link } from "react-router-dom";
import { Box, Github, ShieldCheck } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer mt-auto">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="footer-brand-link" to="/">
              <span className="brand-mark">
                <Box size={19} />
              </span>
              <span>
                RepoVerse <em>3D</em>
              </span>
            </Link>
            <p>
              Explore repository architecture, dependencies, and APIs with
              clear, interactive analysis.
            </p>
            <span className="footer-status">
              <ShieldCheck size={15} />
              Static analysis only
            </span>
          </div>

          <div className="footer-links">
            <h2>Explore</h2>
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/history">Repository History</Link>
          </div>

          <div className="footer-links">
            <h2>Product</h2>
            <Link to="/#features">Features</Link>
            <Link to="/#how-it-works">How It Works</Link>
            <Link to="/about">About</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {year} RepoVerse 3D. All rights reserved.</span>
          <a
            href="https://github.com/vikashvashishth/repoverse"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} />
            View on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
