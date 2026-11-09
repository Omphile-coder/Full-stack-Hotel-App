import goldClover from "../../assets/gold-clover.png";
import {
  Bell,
  Building2,
  CalendarDays,
  Heart,
  House,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSession } from "../../hooks/useSession";
import { useSignOut } from "../../hooks/useSignOut";
import { Feedback } from "../shared/Shared";

/** Show navigation for the current account role on desktop and mobile. */
export function GuestNavbar({
  hero = false,
}: {
  hero?: boolean;
  simple?: boolean;
}) {
  const { user } = useSession();
  const { signOut, error, isLoading } = useSignOut();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <header
        className={"navigation guest-navigation " + (hero ? "on-hero" : "")}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !open) return;
          event.preventDefault();
          setOpen(false);
          menuButton.current?.focus();
        }}
      >
        <Link className="wordmark guest-wordmark" to="/">
          <img src={goldClover} alt="" width={128} height={128} />
          Black Clover
        </Link>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="guest-menu"
          onClick={() => setOpen(!open)}
        >
          Menu{" "}
          {open ? (
            <X className="ui-icon" aria-hidden="true" />
          ) : (
            <Menu className="ui-icon" aria-hidden="true" />
          )}
        </button>
        <nav
          id="guest-menu"
          className={open ? "expanded" : ""}
          aria-label="Main navigation"
          onClick={() => setOpen(false)}
        >
          {user?.role === "ADMIN" ? (
            <>
              <NavLink to="/" end>
                <House className="nav-icon" aria-hidden="true" />
                Home
              </NavLink>
              <NavLink to="/admin">
                <LayoutDashboard className="nav-icon" aria-hidden="true" />
                Admin dashboard
              </NavLink>
            </>
          ) : (
              <>
                <NavLink to="/" end>
                <House className="nav-icon" aria-hidden="true" />
                Home
                </NavLink>
                
              <NavLink to="/hotels">
                <Building2 className="nav-icon" aria-hidden="true" />
                Our locations
              </NavLink>
              <NavLink to="/bookings">
                <CalendarDays className="nav-icon" aria-hidden="true" />
                My bookings
              </NavLink>
              <NavLink to="/favourites">
                <Heart className="nav-icon" aria-hidden="true" />
                Favourites
              </NavLink>
              <NavLink to="/notifications">
                <Bell className="nav-icon" aria-hidden="true" />
                Notifications
              </NavLink>
              <NavLink
                to={user ? "/profile" : "/signin"}
                className={user ? undefined : "nav-session-action"}
              >
                {user ? (
                  <UserRound className="nav-icon" aria-hidden="true" />
                ) : (
                  <LogIn className="nav-icon" aria-hidden="true" />
                )}
                {user ? "My profile" : "Sign in"}
              </NavLink>
              {user && (
                <button className="nav-session-action" disabled={isLoading} onClick={signOut}>
                  <LogOut className="nav-icon" aria-hidden="true" />
                  Sign out
                </button>
              )}
            </>
          )}
        </nav>
      </header>
      <Feedback error={error} />
    </>
  );
}
