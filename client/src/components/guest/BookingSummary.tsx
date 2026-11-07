import { dateLabel,money } from '../../lib/format';
import type { Booking } from '../../lib/types';

/** Shared summary uses stored booking rates and dates rather than client estimates. */
export function StaySummary({ booking }: { booking: Booking }) {
  return <>
    <h2>{booking.bookingRooms[0]?.room.accommodation.name}</h2>
    <div className="stay-summary"><div><p className="eyebrow">CHECK-IN / CHECK-OUT</p><p>{dateLabel(booking.checkInDate)}</p><p>{dateLabel(booking.checkOutDate)}</p></div>
      <div><p>{booking.bookingRooms.map(item => item.room.roomType + ' · ' + item.room.roomNumber).join(', ')}</p><p>{booking.numberOfGuests} guests · {booking.bookingRooms.length} rooms</p></div></div>
    <p className="eyebrow">RESERVATION TOTAL</p><p className="price">{money(booking.totalPrice)}</p>
  </>;
}
