import type { FormEvent } from 'react';
import { useState } from 'react';
import { api } from '../../lib/api';
import type { Room } from '../../lib/types';
import { ConfirmDialog,Feedback,Field } from '../shared/Shared';

/** Each room form saves independently and keeps nightly prices as decimal strings. */
export function RoomForm({ hotelId, room, onSaved }: { hotelId: string; room?: Room; onSaved: () => void }) {
  const [write, state] = api.useWriteRoomMutation();
  const [deactivate, removeState] = api.useDeactivateRoomMutation();
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setSaved(false);
    const body = {
      roomNumber: String(form.get('roomNumber')), roomType: String(form.get('roomType')),
      capacity: Number(form.get('capacity')), pricePerNight: String(form.get('pricePerNight')),
      description: String(form.get('description')).trim() || null, isActive: form.get('isActive') === 'on',
    };
    try { await write({ hotelId, id: room?.id, body }).unwrap(); setSaved(true); if (!room) element.reset(); onSaved(); }
    catch { /* Keep existing values so a failed update is easy to correct. */ }
  }
  async function remove() {
    if (!room) return;
    try { await deactivate({ hotelId, id: room.id }).unwrap(); setConfirm(false); onSaved(); }
    catch { /* Render API failure inside the confirmation dialog. */ }
  }
  return <article className="border-card"><form className="stack" onSubmit={save}>
    <h2>{room ? room.roomType + ' · ' + room.roomNumber : 'Add a room'}</h2>
    <Field label="Room number"><input name="roomNumber" required maxLength={50} defaultValue={room?.roomNumber} /></Field>
    <Field label="Name / room type"><input name="roomType" required maxLength={100} defaultValue={room?.roomType} /></Field>
    <div className="grid two"><Field label="Price / night (R)"><input name="pricePerNight" type="number" min="0.01" max="99999999.99" step="0.01" required defaultValue={room?.pricePerNight} /></Field>
      <Field label="Sleeps"><input name="capacity" type="number" min="1" max="2147483647" required defaultValue={room?.capacity || 2} /></Field></div>
    <Field label="Description"><textarea name="description" maxLength={2000} rows={3} defaultValue={room?.description || ''} /></Field>
    <label className="check"><input name="isActive" type="checkbox" defaultChecked={room ? room.isActive : true} /> Available for new reservations</label>
    <Feedback error={state.error} /><p role="status">{saved ? 'Room saved.' : ''}</p>
    <div className="actions"><button className="button" disabled={state.isLoading}>{state.isLoading ? 'Saving…' : 'Save'}</button>
      {room?.isActive && <button type="button" className="button outline" onClick={() => setConfirm(true)}>Deactivate room</button>}</div>
  </form>
    {confirm && <ConfirmDialog title="Deactivate this room?" onClose={() => setConfirm(false)} onConfirm={remove} busy={removeState.isLoading} error={removeState.error}><p>The room will be removed from new availability searches.</p></ConfirmDialog>}
  </article>;
}
