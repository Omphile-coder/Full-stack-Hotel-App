import { useNavigate } from 'react-router-dom';
import { useSession } from './useSession';

/** Confirm sign-out, clear the server session, and show the shared signed-out screen. */
export function useSignOut() {
  const session = useSession();
  const navigate = useNavigate();
  async function signOut() {
    const confirmed = await session.confirm({
      title: 'Sign out?',
      message: 'You can sign in again to view your bookings and saved stays.',
      confirmLabel: 'Sign out',
    });
    if (!confirmed) return;
    try {
      await session.logout();
      navigate('/signed-out', { replace: true });
    } catch { /* Navigation and profile components display the session mutation error. */ }
  }
  return { signOut, error: session.logoutError, isLoading: session.logoutPending };
}

