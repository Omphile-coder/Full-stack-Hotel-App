import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { dateLabel,today } from '../../lib/format';
import type { Booking,ReservationInput } from '../../lib/types';
import { ConfirmDialog,Feedback,Field,Heading } from '../shared/Shared';

/** Repricing and conflict detection remain server-side when staff adjust an existing stay. */
export function ModifyForm({ booking }: { booking: Booking }) {
  const hotelId = booking.bookingRooms[0]?.room.accommodation.id || '';
  const hotel = api.useAdminHotelQuery(hotelId, { skip: !hotelId });
  const [pending, setPending] = useState<ReservationInput | null>(null);
  const [update, state] = api.useUpdateBookingMutation();
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomIds = form.getAll('roomIds').map(String);
    if (!roomIds.length || roomIds.length > 20) return setMessage('Select between 1 and 20 rooms.');
    state.reset();
    setMessage('');
    setPending({
      checkInDate: String(form.get('checkInDate')), checkOutDate: String(form.get('checkOutDate')),
      numberOfGuests: Number(form.get('numberOfGuests')), roomIds,
    });
  }
  async function save() {
    if (!pending) return;
    try { await update({ id: booking.id, body: { ...pending, status: 'MODIFIED' } }).unwrap(); navigate('/admin/bookings/' + booking.id); }
    catch { /* Keep the confirmation visible when rooms conflict or a payment blocks changes. */ }
  }
  return <main className="section form-page wide-form" id="main" tabIndex={-1}>
    <Heading eyebrow={'RESERVATION ' + booking.id}>Adjust the stay.</Heading>
    <form className="stack" onSubmit={review}>
      <Field label="Check-in"><input name="checkInDate" type="date" required min={today()} defaultValue={booking.checkInDate.slice(0, 10)} /></Field>
      <Field label="Check-out"><input name="checkOutDate" type="date" required min={today()} defaultValue={booking.checkOutDate.slice(0, 10)} /></Field>
      <Field label="Guests"><input name="numberOfGuests" type="number" min="1" max="1000" required defaultValue={booking.numberOfGuests} /></Field>
      <Feedback loading={hotel.isLoading} error={hotel.error} retry={hotel.refetch} />
      <fieldset className="room-selection"><legend>Rooms</legend>{hotel.data?.rooms?.filter(room => room.isActive).map(room =>
        <label className="room-option" key={room.id}><input name="roomIds" value={room.id} type="checkbox" defaultChecked={booking.bookingRooms.some(item => item.roomId === room.id)} /><span>{room.roomType} · {room.roomNumber} · Sleeps {room.capacity}</span></label>)}</fieldset>
      <p className="notice">Availability and the revised total will be checked when you submit the change.</p><p role="alert">{message}</p>
      <button className="button" disabled={hotel.isLoading}>Review changes</button><Link className="button outline" to={'/admin/bookings/' + booking.id}>Back without submitting</Link>
    </form>
    {pending && <ConfirmDialog title="Submit these changes?" onConfirm={save} onClose={() => setPending(null)} error={state.error} busy={state.isLoading}>
      <p>{dateLabel(pending.checkInDate)} – {dateLabel(pending.checkOutDate)}</p><p>{pending.numberOfGuests} guests · {pending.roomIds.length} rooms</p>
    </ConfirmDialog>}
  </main>;
}
