import { createContext } from 'react';
import type { User } from '../lib/types';

export interface Confirmation {
  title: string;
  message: string;
  confirmLabel?: string;
}
export interface AppSession {
  user: User | undefined;
  loading: boolean;
  error: unknown;
  refresh: () => void;
  startGoogle: (returnTo: string) => void;
  logout: () => Promise<void>;
  logoutPending: boolean;
  logoutError: unknown;
  toast: (message: string) => void;
  confirm: (options: Confirmation) => Promise<boolean>;
}

/** Session data is derived from the Redux API cache, with transient UI actions alongside it. */
export const SessionContext = createContext<AppSession | null>(null);

