import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiMessage } from "../services/api";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (
      !values.fullName.trim() ||
      !values.email ||
      !values.password ||
      !values.confirm
    )
      return setError("Complete every field.");
    if (!/^\S+@\S+\.\S+$/.test(values.email))
      return setError("Enter a valid email address.");
    if (values.password.length < 8)
      return setError("Use a password with at least 8 characters.");
    if (values.password !== values.confirm)
      return setError("Passwords do not match.");
    setBusy(true);
    try {
      await signup({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
      navigate("/", { replace: true });
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
          <UserPlus />
        </div>
        <h1>Create your workspace</h1>
        <p className="text-secondary">
          Start inspecting code with a protected account.
        </p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit} noValidate>
          <label className="form-label" htmlFor="fullName">
            Full name
          </label>
          <input
            className="form-control"
            id="fullName"
            autoComplete="name"
            value={values.fullName}
            onChange={(e) => setValues({ ...values, fullName: e.target.value })}
          />
          <label className="form-label mt-3" htmlFor="email">
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
              autoComplete="new-password"
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
          <label className="form-label mt-3" htmlFor="confirm">
            Confirm password
          </label>
          <input
            className="form-control"
            id="confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={values.confirm}
            onChange={(e) => setValues({ ...values, confirm: e.target.value })}
          />
          <button className="btn btn-primary w-100 mt-4" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            Create Account
          </button>
        </form>
        <p className="text-center small mt-4 mb-0">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  );
}
