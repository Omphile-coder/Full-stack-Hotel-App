import { Link } from 'react-router-dom';
import { money } from '../../lib/format';
import type { Room } from '../../lib/types';

/** Room cards pass the chosen room into checkout while preserving the current search dates. */
export function RoomCard({ room, to }: { room: Room; to: string }) {
  return <article className="hotel-card room-card">
    <img src="/images/figma/room.png" alt={room.roomType} loading="lazy" /><h2>{room.roomType}</h2>
    <p className="muted">{room.description}</p><p>From {money(room.pricePerNight)} / night · Sleeps {room.capacity}</p>
    <Link className="button outline" to={to}>Select room</Link>
  </article>;
}

