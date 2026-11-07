import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/** Profile shortcuts follow the reference account hub and lead to independent guest tasks. */
export function ProfileLinks() {
  const links = [
    ["/bookings", "View bookings"],
    ["/favourites", "Favourites"],
    ["/notifications", "Notifications"],
    ["/hotels", "Our locations"],
  ];
  return (
    <nav className="profile-links" aria-label="Account shortcuts">
      {links.map(([to, label]) => (
        <Link to={to} key={to}>
          <span>{label}</span>
          <ArrowRight className="ui-icon" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
