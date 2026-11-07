import { apiBase } from './api';

/** Send credentials directly so passwords and reset tokens never enter the Redux store. */
export async function submitCredentials(path: 'login' | 'register' | 'forgot-password' | 'reset-password', fields: FormData) {
  const response = await fetch(`${apiBase}/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(fields)),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) throw { status: response.status, data };
}
