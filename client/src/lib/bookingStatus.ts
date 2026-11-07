import type { Booking } from './types';

/** Confirmation follows verified payment; database reservation states never require guest approval. */
export function bookingLabel(booking: Booking) {
  if (booking.status === 'CANCELLED') return 'Cancelled';
  return booking.payments.some(payment => payment.status === 'COMPLETED') ? 'Confirmed' : 'Awaiting payment';
}
