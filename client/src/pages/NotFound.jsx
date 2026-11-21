import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <section className="section-pad">
      <div className="container narrow text-center">
        <p className="eyebrow">404</p>
        <h1 className="page-title">That page isn’t here.</h1>
        <p className="text-secondary">
          Return home and choose a starting point.
        </p>
        <Link className="btn btn-primary" to="/">
          Go to Home
        </Link>
      </div>
    </section>
  );
}
