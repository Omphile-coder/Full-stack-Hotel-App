import { useState } from 'react';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { Feedback,Field } from '../shared/Shared';
import { RoomForm } from './RoomForm';

/** The inventory table opens one add/edit form at a time, matching the reference management flow. */
export function RoomWorkspace({ hotelId }: { hotelId: string }) {
  const hotel = api.useAdminHotelQuery(hotelId);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const rooms = hotel.data?.rooms?.filter(room =>
    (room.roomType + ' ' + room.roomNumber).toLowerCase().includes(search.toLowerCase()) &&
    (!status || String(room.isActive) === status)) || [];
  const room = hotel.data?.rooms?.find(item => item.id === editing);
  return <section className="stack spaced">
    <Feedback loading={hotel.isLoading} error={hotel.error} retry={hotel.refetch} />
    <div className="title-actions"><h2>{hotel.data?.name}</h2><button className="button" onClick={() => { setMessage(''); setEditing('new'); }}>+ Add room</button></div>
    <div className="list-toolbar"><Field label="Search rooms"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Room type or number" /></Field>
      <Field label="Availability"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All rooms</option><option value="true">Active</option><option value="false">Inactive</option></select></Field></div>
    <p role="status">{message}</p>
    <div className="table-scroll"><table className="management-table"><caption>Room inventory</caption><thead><tr><th>Room</th><th>Type</th><th>Nightly rate</th><th>Capacity</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{rooms.map(item => <tr key={item.id}><td>{item.roomNumber}</td><td>{item.roomType}</td><td>{money(item.pricePerNight)}</td><td>{item.capacity}</td>
        <td><span className="status-badge">{item.isActive ? 'Active' : 'Inactive'}</span></td><td><button className="button outline" onClick={() => { setMessage(''); setEditing(item.id); }}>Edit room</button></td></tr>)}</tbody></table></div>
    {hotel.data && rooms.length === 0 && <p className="notice">No rooms match these filters.</p>}
    {editing && <div className="room-editor"><button className="text-button" onClick={() => setEditing(null)}>Close editor</button>
      <RoomForm key={editing} hotelId={hotelId} room={room} onSaved={() => { setEditing(null); setMessage('Room saved.'); }} /></div>}
  </section>;
}
