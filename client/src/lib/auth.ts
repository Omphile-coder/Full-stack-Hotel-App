import type { User } from './types';

/** Allow only local return routes supplied during a booking or another protected task. */
export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '';
  return value;
}

/** Resume the requested task, otherwise send admins to management and guests to confirmation. */
export function accountDestination(user: User, next: string | null) {
  const requested = safeReturnPath(next);
  const route = requested.split('?')[0];
  if (requested && !['/signin', '/login', '/register', '/forgot-password', '/reset-password', '/auth/callback'].includes(route)) return requested;
  return user.role === 'ADMIN' ? '/admin' : '/signin-success';
}

