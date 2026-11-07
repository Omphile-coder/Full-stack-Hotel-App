import type { Hotel } from './types';

/** Format the API's decimal strings as South African rand for display only. */
export function money(amount: string | number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(Number(amount));
}

/** Date-only booking values use UTC so timezone conversion cannot shift the calendar day. */
export function dateLabel(value: string) {
  if (!Number.isFinite(Date.parse(value))) return 'Choose a valid date';
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

/** Validate dates restored from URLs before using them in the availability API. */
export function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : '';
}

/** Provide a local calendar date in the hotel's timezone for date-input constraints. */
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
}

/** Use a server-provided photograph, with the matching Figma city photograph as a fallback. */
export function hotelPhoto(hotel: Hotel) {
  const supplied = hotel.coverImage?.imageUrl || hotel.images?.[0]?.imageUrl;
  if (supplied) return supplied;
  const city = hotel.city.toLowerCase();
  if (city.includes('cape')) return '/images/figma/cape-town.png';
  if (city.includes('johannesburg')) return '/images/figma/johannesburg.png';
  if (city.includes('franschhoek')) return '/images/figma/winelands.png';
  return '/images/figma/room.png';
}

/** Convert RTK Query errors into readable feedback without displaying raw responses. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('data' in error && error.data && typeof error.data === 'object' &&
        'message' in error.data && typeof error.data.message === 'string') return error.data.message;
    if ('status' in error && error.status === 401) return 'Please sign in to continue.';
    if ('status' in error && error.status === 403) return 'Administrator access is required.';
  }
  return 'We could not complete this request. Please try again.';
}
