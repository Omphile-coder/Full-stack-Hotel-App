import { NavLink } from "react-router-dom";

/** Account tabs mirror the separate guest pages while preserving deep links. */
export function AccountNavigation() {
  return (
    <nav className="account-navigation" aria-label="My account">
      <NavLink to="/profile">Profile</NavLink>
      <NavLink to="/bookings">My bookings</NavLink>
      <NavLink to="/favourites">Favourites</NavLink>
      <NavLink to="/notifications">Notifications</NavLink>
    </nav>
  );
}
