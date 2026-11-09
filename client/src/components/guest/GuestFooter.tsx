import { Link } from "react-router-dom";

/** Render the common footer using the green and cream brand colours. */
export function GuestFooter() {
  return (
    <footer className="footer">
      <Link className="wordmark" to="/">
        Black Clover
      </Link>
      <p>© {new Date().getFullYear()} Black Clover Hotels</p>
      <Link to="/hotels">Explore our locations</Link>
    </footer>
  );
}
