import { Link } from "react-router-dom";

/** Render the common footer using the green and cream brand colours. */
export function GuestFooter() {
  return (
    <footer className="footer">
      <Link className="wordmark" to="/">
        HALDEN
      </Link>
      <p>© {new Date().getFullYear()} Halden Hotels</p>
      <Link to="/hotels">Explore our locations</Link>
    </footer>
  );
}
