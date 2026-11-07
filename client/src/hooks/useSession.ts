import { useContext } from 'react';
import { SessionContext } from '../context/sessionContext';

/** Access the shared server session without keeping a second copy of the user in browser storage. */
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession requires AppProvider');
  return session;
}

