export default function LoadingSpinner({ label = "Loading…" }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-secondary">
      <div className="spinner-border spinner-border-sm" role="status" />
      <span>{label}</span>
    </div>
  );
}
