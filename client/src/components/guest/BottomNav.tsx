import { NavLink } from "react-router-dom";
import { useSession } from "../../hooks/useSession";

/** Mobile shortcuts keep frequent guest tasks available while browsing hotel pages. */
export function BottomNav() {
  const { user } = useSession();
  if (user?.role === "ADMIN") return null;

  return (
    <nav className="bottom-navigation" aria-label="Guest shortcuts">
      <NavLink to="/hotels">Explore</NavLink>
      <NavLink to="/bookings">Bookings</NavLink>
      <NavLink to="/favourites">Favourites</NavLink>
      <NavLink to="/profile">Profile</NavLink>
    </nav>
  );
}
