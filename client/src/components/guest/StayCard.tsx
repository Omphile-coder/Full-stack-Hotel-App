import { api } from "../../lib/api";
import { calendarDate, today } from "../../lib/format";
import type { Hotel } from "../../lib/types";
import { HotelCard } from "./HotelCard";

/** Each search card checks date availability through the existing backend endpoint. */
export function StayCard({
  hotel,
  params,
}: {
  hotel: Hotel;
  params: URLSearchParams;
}) {
  const checkInDate = params.get("checkInDate") || "";
  const checkOutDate = params.get("checkOutDate") || "";
  const datesValid =
    Boolean(calendarDate(checkInDate) && calendarDate(checkOutDate)) &&
    checkInDate >= today() &&
    checkOutDate > checkInDate;
  const availability = api.useAvailabilityQuery(
    { id: hotel.id, checkInDate, checkOutDate },
    { skip: !datesValid },
  );
  const roomCount = Math.max(1, Number(params.get("roomCount")) || 1);
  const guests = Math.max(1, Number(params.get("guests")) || 2);
  const rooms =
    availability.data?.filter(
      (room) =>
        (!params.get("minPrice") ||
          Number(room.pricePerNight) >= Number(params.get("minPrice"))) &&
        (!params.get("maxPrice") ||
          Number(room.pricePerNight) <= Number(params.get("maxPrice"))),
    ) || [];
  const capacity = [...rooms]
    .sort((a, b) => b.capacity - a.capacity)
    .slice(0, roomCount)
    .reduce((sum, room) => sum + room.capacity, 0);
  const fits = rooms.length >= roomCount && capacity >= guests;
  const displayHotel =
    datesValid && availability.data
      ? {
          ...hotel,
          fromPrice: rooms.length
            ? rooms.reduce(
                (lowest, room) =>
                  Number(room.pricePerNight) < Number(lowest)
                    ? room.pricePerNight
                    : lowest,
                rooms[0]!.pricePerNight,
              )
            : null,
        }
      : hotel;
  return (
    <HotelCard hotel={displayHotel} search={params.toString()}>
      {datesValid && (
        <p
          className={"availability-label " + (fits ? "available" : "")}
          role="status"
        >
          {availability.isFetching
            ? "Checking your dates…"
            : availability.error
              ? "Open the hotel to retry availability."
              : fits
                ? "Rooms available for your party"
                : "Try different dates, rooms, or a smaller party"}
        </p>
      )}
    </HotelCard>
  );
}
