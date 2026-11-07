import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { bookingLabel } from '../lib/bookingStatus';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link,useParams,useSearchParams } from 'react-router-dom';
import { RoomWorkspace } from '../components/admin/AdminRooms';
import { HotelForm } from '../components/admin/BranchForm';
import { ModifyForm } from '../components/admin/ReservationForm';
import { StaySummary } from '../components/guest/BookingSummary';
import { ConfirmDialog,Feedback,Field,Heading,Pagination } from '../components/shared/Shared';
import { api } from '../lib/api';
import { dateLabel,money } from '../lib/format';

/** Dashboard metrics come from server aggregates and link into the management tasks. */
export function Dashboard() {
  const summary = api.useAdminSummaryQuery(undefined, { refetchOnFocus: true });
  const data = summary.data;
  return <main className="section" id="main" tabIndex={-1}>
    <Heading eyebrow="ADMIN WORKSPACE" subtitle="An overview of your properties, rooms, and guest reservations.">Good day, team.</Heading>
    <Feedback loading={summary.isLoading} error={summary.error} retry={summary.refetch} />
    {data && <>
      <div className="stats-grid">
        <Link className="soft-card" to="/admin/hotels"><span className="eyebrow">ACCOMMODATIONS</span><span className="stat-value">{data.hotels}</span><span>{data.publishedHotels} published</span></Link>
        <Link className="soft-card" to="/admin/rooms"><span className="eyebrow">ACTIVE ROOMS</span><span className="stat-value">{data.activeRooms}</span><span>Manage rooms {'&'} pricing <ArrowRight className="ui-icon" aria-hidden="true" /></span></Link>
        <Link className="soft-card" to="/admin/bookings"><span className="eyebrow">RESERVATIONS</span><span className="stat-value">{data.reservations}</span><span>{data.pendingReservations} awaiting payment</span></Link>
        <div className="soft-card"><span className="eyebrow">PAYMENTS RECEIVED</span><span className="stat-value payment-stat">{money(data.receivedPayments)}</span><span>Completed ZAR payments</span></div>
      </div>
      <section className="border-card stack spaced"><div className="title-actions"><h2>Recent reservations</h2><Link className="explore-link" to="/admin/bookings">View all reservations <ArrowRight className="ui-icon" aria-hidden="true" /></Link></div>
        {data.recentBookings.length ? <div className="table-scroll"><table className="management-table"><thead><tr><th>Guest</th><th>Hotel</th><th>Check-in</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
          <tbody>{data.recentBookings.map(booking => <tr key={booking.id}><td>{booking.user?.name}</td><td>{booking.bookingRooms[0]?.room.accommodation.name}</td><td>{dateLabel(booking.checkInDate)}</td><td><span className="status-badge">{bookingLabel(booking)}</span></td><td>{money(booking.totalPrice)}</td><td><Link className="explore-link" to={'/admin/bookings/' + booking.id}>Manage <ArrowRight className="ui-icon" aria-hidden="true" /></Link></td></tr>)}</tbody></table></div> :
          <p className="notice">New reservations will appear here.</p>}
      </section>
    </>}
    <div className="actions spaced"><Link className="button" to="/admin/hotels/new">+ Add accommodation</Link><Link className="button outline" to="/admin/rooms">Manage rooms</Link><Link className="button outline" to="/admin/notifications">Compose promotion</Link></div>
  </main>;
}

/** Staff compose real promotions in a dedicated notification workspace. */
export function Promotions() {
  const [promotion, state] = api.usePromotionMutation();
  const [sent, setSent] = useState(false);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSent(false);
    try { await promotion(String(new FormData(form).get('message'))).unwrap(); form.reset(); setSent(true); }
    catch { /* Show the provider's API response beneath the promotion form. */ }
  }
  return <main className="section" id="main" tabIndex={-1}>
    <Heading eyebrow="GUEST COMMUNICATION" subtitle="Publish a promotion to the in-app notification feed.">Notifications</Heading>
    <form className="stack promotion-form" onSubmit={publish}><h2>Keep your guests in the loop.</h2><Field label="Promotion message"><textarea name="message" maxLength={1000} required rows={3} /></Field>
      <Feedback error={state.error} /><p role="status">{sent ? 'Your promotion was published to the guest notification feed.' : ''}</p>
      <button className="button" disabled={state.isLoading}>{state.isLoading ? 'Publishing…' : 'Publish promotion'}</button></form>
  </main>;
}

/** Staff search and filter the current inventory page before opening an editor. */
export function AdminHotels() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState('');
  const hotels = api.useAdminHotelsQuery(offset);
  const items = hotels.data?.filter(hotel =>
    (hotel.name + ' ' + hotel.city).toLowerCase().includes(search.toLowerCase()) &&
    (!published || String(hotel.isPublished) === published)) || [];
  return <main className="section" id="main" tabIndex={-1}>
    <div className="title-actions"><Heading eyebrow="ACCOMMODATIONS">Your locations</Heading><Link className="button" to="/admin/hotels/new">+ Add accommodation</Link></div>
    <div className="list-toolbar"><Field label="Search this page"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Hotel or city" /></Field>
      <Field label="Publication"><select value={published} onChange={event => setPublished(event.target.value)}><option value="">All properties</option><option value="true">Published</option><option value="false">Unpublished</option></select></Field></div>
    <Feedback loading={hotels.isLoading} error={hotels.error} retry={hotels.refetch} />
    <div className="table-scroll"><table className="management-table"><caption>Accommodation inventory · current page</caption>
      <thead><tr><th>Accommodation</th><th>City</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{items.map(hotel => <tr key={hotel.id}><td className="table-name">{hotel.name}</td><td>{hotel.city}</td><td>{hotel.starRating} stars</td><td><span className="status-badge">{hotel.isPublished ? 'Published' : 'Unpublished'}</span></td><td><div className="actions">
        <Link className="explore-link" to={'/admin/hotels/' + hotel.id + '/edit'}>Edit</Link><Link className="explore-link" to={'/admin/rooms?hotel=' + hotel.id}>Manage rooms</Link>
        {hotel.isPublished && <Link className="explore-link" to={'/hotels/' + hotel.id}>View <ArrowUpRight className="ui-icon" aria-hidden="true" /></Link>}</div></td></tr>)}</tbody></table></div>
    {hotels.data && items.length === 0 && <p className="notice">No accommodations match this page's filters.</p>}
    <Pagination offset={offset} count={hotels.data?.length || 0} setOffset={setOffset} />
  </main>;
}

/** Wait for the existing hotel before mounting uncontrolled edit fields. */
export function HotelEditor() {
  const { id } = useParams();
  const query = api.useAdminHotelQuery(id || '', { skip: !id });
  if (id && !query.data) return <main className="section"><Feedback loading={query.isLoading} error={query.error} retry={query.refetch} /></main>;
  return <HotelForm key={id || 'new'} hotel={query.data} />;
}

/** Staff can select a property from paginated inventory before managing its physical rooms. */
export function Rooms() {
  const [params, setParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const hotels = api.useAdminHotelsQuery(offset);
  const id = params.get('hotel') || hotels.data?.[0]?.id || '';

  return <main className="section" id="main" tabIndex={-1}>
    <Heading eyebrow="ROOMS & PRICING">Make room for a memorable stay.</Heading>
    <nav className="actions"><Link className="button outline" to="/admin/bookings">Bookings</Link><Link className="button outline" to="/admin/hotels">Locations</Link><span className="button">Rooms</span></nav>
    <Feedback loading={hotels.isLoading} error={hotels.error} retry={hotels.refetch} />
    <Field label="Location"><select value={id} onChange={event => setParams({ hotel: event.target.value })}>
      {id && !hotels.data?.some(item => item.id === id) && <option value={id}>Selected location</option>}
      {hotels.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></Field>
    <Pagination offset={offset} count={hotels.data?.length || 0} setOffset={setOffset} />
    {id && <RoomWorkspace key={id} hotelId={id} />}
    {!hotels.isLoading && hotels.data?.length === 0 && <p className="notice">Create an accommodation before adding rooms.</p>}
  </main>;
}

/** Staff find a reservation by guest, hotel, or reference before managing its state. */
export function Reservations() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const bookings = api.useAdminBookingsQuery(offset, { refetchOnFocus: true });
  const items = bookings.data?.filter(booking =>
    [booking.user?.name, booking.user?.email, booking.id, booking.bookingRooms[0]?.room.accommodation.name]
      .join(' ').toLowerCase().includes(search.toLowerCase()) && (!status || bookingLabel(booking) === status)) || [];
  return <main className="section" id="main" tabIndex={-1}><Heading eyebrow="RESERVATIONS" subtitle="Find a guest stay and open it to review payment, modify, or cancel.">Guest stays</Heading>
    <div className="list-toolbar"><Field label="Search this page"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Guest, hotel, or booking reference" /></Field>
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['Awaiting payment', 'Confirmed', 'Cancelled'].map(value => <option key={value} value={value}>{value}</option>)}</select></Field></div>
    <Feedback loading={bookings.isLoading} error={bookings.error} retry={bookings.refetch} />
    <div className="table-scroll"><table className="management-table"><caption>Guest reservations · current page</caption><thead><tr><th>Guest</th><th>Stay</th><th>Occupancy</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
      <tbody>{items.map(booking => <tr key={booking.id}><td><strong>{booking.user?.name}</strong><small>{booking.user?.email}</small><small>{booking.id}</small></td>
        <td>{booking.bookingRooms[0]?.room.accommodation.name}<small>{dateLabel(booking.checkInDate)} – {dateLabel(booking.checkOutDate)}</small></td>
        <td>{booking.numberOfGuests} guests · {booking.bookingRooms.length} rooms</td><td><span className="status-badge">{bookingLabel(booking)}</span></td>
        <td>{money(booking.totalPrice)}</td><td><Link className="button outline" to={'/admin/bookings/' + booking.id}>Manage</Link></td></tr>)}</tbody></table></div>
    {bookings.data && items.length === 0 && <p className="notice">No reservations match this page's filters.</p>}
    <Pagination offset={offset} count={bookings.data?.length || 0} setOffset={setOffset} />
  </main>;
}

/** Reservation details require explicit confirmation before changing the saved status. */
export function Reservation() {
  const { id = '' } = useParams();
  const query = api.useAdminBookingQuery(id);
  const [pending, setPending] = useState<'CANCELLED' | null>(null);
  const [update, state] = api.useUpdateBookingMutation();
  const [message, setMessage] = useState('');
  async function save() {
    if (!pending) return;
    try { await update({ id, body: { status: pending } }).unwrap(); setMessage('Reservation updated. The guest has been notified.'); setPending(null); }
    catch { /* Leave the proposed change visible with the server's reason for rejection. */ }
  }
  return <main className="section form-page wide-form" id="main" tabIndex={-1}>
    <Heading eyebrow={'RESERVATION ' + id}>A stay to manage.</Heading>
    <Feedback loading={query.isLoading} error={query.error} retry={query.refetch} />
    {query.data && <>
      <p>{query.data.user?.name} · {query.data.user?.email}</p><p>{query.data.user?.phoneNumber}</p><StaySummary booking={query.data} />
      <p className="eyebrow">CURRENT STATUS</p><p className="status-label">{bookingLabel(query.data)}</p>
      <p role="status">{message}</p>
      {query.data.status !== 'CANCELLED' && <div className="actions">
        <Link className="button outline" to={'/admin/bookings/' + id + '/modify'}>Modify</Link>
        <button className="button outline" onClick={() => { state.reset(); setPending('CANCELLED'); }}>Cancel reservation</button>
      </div>}
      {pending && <ConfirmDialog title="Cancel this reservation?" onConfirm={save} onClose={() => setPending(null)} error={state.error} busy={state.isLoading}>
        <p>{query.data.user?.name} · {query.data.bookingRooms[0]?.room.accommodation.name}</p><p>New status · {pending.toLowerCase()}</p>
      </ConfirmDialog>}
    </>}
    <Link className="button outline" to="/admin/bookings">Back to reservations</Link>
  </main>;
}

/** Load the reservation before initialising date and room fields for the edit form. */
export function ModifyReservation() {
  const { id = '' } = useParams();
  const query = api.useAdminBookingQuery(id);
  if (!query.data) return <main className="section"><Feedback loading={query.isLoading} error={query.error} retry={query.refetch} /></main>;
  return <ModifyForm key={id} booking={query.data} />;
}
