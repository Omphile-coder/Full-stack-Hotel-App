import { Link,Navigate,Outlet,useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { Feedback,Heading } from './Shared';

/** Protect guest and staff screens while the backend remains the permission authority. */
export function Protected({ admin = false }: { admin?: boolean }) {
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = api.useMeQuery(undefined, { refetchOnMountOrArgChange: true });
  const location = useLocation();
  if (isLoading)
    return (
      <main className="section">
        <Feedback loading />
      </main>
    );
  if (error && "status" in error && error.status === 401) {
    return (
      <Navigate
        to={
          "/signin?next=" +
          encodeURIComponent(location.pathname + location.search)
        }
        replace
      />
    );
  }
  if (error)
    return (
      <main className="section">
        <Feedback error={error} retry={refetch} />
      </main>
    );
  if (admin && user?.role !== "ADMIN")
    return (
      <main className="section form-page">
        <Heading eyebrow="ADMIN ACCESS">Administrator access required.</Heading>
        <p>This page requires an account assigned the administrator role.</p>
        <Link className="button" to="/profile">
          Back to my profile
        </Link>
      </main>
    );
  return <Outlet />;
}
