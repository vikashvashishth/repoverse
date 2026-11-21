import { Eye, EyeOff, LogIn } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiMessage } from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!values.email || !values.password)
      return setError("Enter your email and password.");
    setBusy(true);
    try {
      await login(values);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">
          <LogIn />
        </div>
        <h1>Welcome back</h1>
        <p className="text-secondary">Sign in to inspect your repositories.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit} noValidate>
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            className="form-control"
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
          <label className="form-label mt-3" htmlFor="password">
            Password
          </label>
          <div className="input-group">
            <input
              className="form-control"
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => setShow(!show)}
              aria-label="Show or hide password"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button className="btn btn-primary w-100 mt-4" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            Sign In
          </button>
        </form>
        <p className="text-center small mt-4 mb-0">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </section>
  );
}
