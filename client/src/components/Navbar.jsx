import { Link, NavLink, useNavigate } from "react-router-dom";
import { Box, LayoutDashboard, LogOut, Menu, Network, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const active = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  const signOut = () => {
    logout();
    close();
    navigate("/");
  };
  return (
    <header className="site-header sticky-top">
      <nav className="navbar navbar-expand-lg container py-3">
        <Link
          className="navbar-brand d-flex align-items-center gap-2"
          to="/"
          onClick={close}
        >
          <span className="brand-mark">
            <Box size={19} />
          </span>
          <span>
            RepoVerse <em>3D</em>
          </span>
        </Link>
        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          {open ? <X /> : <Menu />}
        </button>
        <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
          <div className="navbar-nav ms-auto align-items-lg-center gap-lg-1 pt-3 pt-lg-0">
            <NavLink className={active} to="/" onClick={close}>
              Home
            </NavLink>
            <a className="nav-link" href="/#features" onClick={close}>
              Features
            </a>
            <a className="nav-link" href="/#how-it-works" onClick={close}>
              How It Works
            </a>
            <NavLink className={active} to="/about" onClick={close}>
              About
            </NavLink>
            {user ? (
              <>
                <NavLink className={active} to="/dashboard" onClick={close}>
                  <LayoutDashboard size={16} className="me-1" />
                  Dashboard
                </NavLink>
                <NavLink className={active} to="/history" onClick={close}>
                  <Network size={16} className="me-1" />
                  Repository History
                </NavLink>
                <span className="user-chip" title={user.email}>
                  {user.fullName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <button
                  className="btn btn-link nav-link text-start"
                  onClick={signOut}
                >
                  <LogOut size={16} className="me-1" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  className="btn btn-link nav-link"
                  to="/login"
                  onClick={close}
                >
                  Login
                </NavLink>
                <NavLink
                  className="btn btn-primary ms-lg-2 px-3"
                  to="/signup"
                  onClick={close}
                >
                  Sign Up
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
