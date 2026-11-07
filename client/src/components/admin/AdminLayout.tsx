import { ArrowUpRight, X, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link,NavLink,Outlet } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { useSignOut } from '../../hooks/useSignOut';
import { Feedback } from '../shared/Shared';

/** Staff use a persistent management sidebar and a collapsible mobile menu. */
export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { signOut, error, isLoading } = useSignOut();
  const { user } = useSession();
  const links = [
    ["/admin", "Dashboard"],
    ["/admin/hotels", "Accommodations"],
    ["/admin/rooms", "Rooms & pricing"],
    ["/admin/bookings", "Reservations"],
    ["/admin/notifications", "Notifications"],
  ];
  return (
    <div className="admin-workspace">
      <header className="admin-mobile-header">
        <Link className="wordmark" to="/admin">
          HALDEN · ADMIN
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="staff-menu"
          onClick={() => setOpen(!open)}
        >
          Menu {open ? <X className="ui-icon" aria-hidden="true" /> : <Menu className="ui-icon" aria-hidden="true" />}
        </button>
      </header>
      <aside
        className={"admin-sidebar " + (open ? "expanded" : "")}
        id="staff-menu"
      >
        <Link className="wordmark" to="/admin">
          Black Clover 
        </Link>
        <p className="eyebrow">ADMINISTRATION</p>
        <nav aria-label="Staff navigation">
          {links.map(([path, label]) => (
            <NavLink
              to={path}
              key={path}
              end={path === "/admin"}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <p>{user?.name}</p>
          <Link to="/">Visit guest website <ArrowUpRight className="ui-icon" aria-hidden="true" /></Link>
          <button
            className="button outline"
            disabled={isLoading}
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
        <Feedback error={error} />
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}

