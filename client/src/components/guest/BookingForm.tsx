import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { chooseStay, clearStay } from "../../lib/bookingDraft";
import { calendarDate, dateLabel, money, today } from "../../lib/format";
import type { RootState } from "../../store";
import { Feedback, Field, Heading } from "../shared/Shared";

/** Checkout carries dates and guests from search, with a continuously updated booking summary. */
export function StayForm({ hotelId }: { hotelId: string }) {
  const draft = useSelector((state: RootState) => state.bookingDraft);
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hotel = api.useHotelQuery(hotelId);
  const { data: user } = api.useMeQuery();
  const [checkInDate, setCheckIn] = useState(
    calendarDate(params.get("checkInDate") ?? draft.checkInDate),
  );
  const [checkOutDate, setCheckOut] = useState(
    calendarDate(params.get("checkOutDate") ?? draft.checkOutDate),
  );
  const [guests, setGuests] = useState(
    Number(params.get("guests")) || draft.numberOfGuests,
  );
  const [roomCount, setRoomCount] = useState(
    Number(params.get("roomCount")) || draft.roomCount,
  );
  const [roomIds, setRoomIds] = useState<string[]>(() =>
    params.get("room")
      ? [params.get("room")!]
      : draft.hotelId === hotelId
        ? draft.roomIds
        : [],
  );
  const [review, setReview] = useState(false);
  const [reserve, reservation] = api.useCreateBookingMutation();
  const datesValid =
    Boolean(calendarDate(checkInDate) && calendarDate(checkOutDate)) &&
    checkInDate >= today() &&
    checkOutDate > checkInDate;
  const available = api.useAvailabilityQuery(
    { id: hotelId, checkInDate, checkOutDate },
    { skip: !datesValid, refetchOnMountOrArgChange: true },
  );
  const selected =
    available.currentData?.filter((room) => roomIds.includes(room.id)) || [];
  const nights = datesValid
    ? (Date.parse(checkOutDate) - Date.parse(checkInDate)) / 86400000
    : 0;
  const capacity = selected.reduce((sum, room) => sum + room.capacity, 0);
  const estimate =
    selected.reduce((sum, room) => sum + Number(room.pricePerNight), 0) *
    nights;
  const valid =
    datesValid &&
    nights <= 365 &&
    Number.isInteger(guests) &&
    guests > 0 &&
    guests <= 1000 &&
    roomCount >= 1 &&
    roomCount <= 20 &&
    selected.length === roomCount &&
    capacity >= guests &&
    !available.isFetching &&
    !available.error;

  // Preserve selections through browsing and the full-page Google sign-in redirect.
  useEffect(() => {
    dispatch(
      chooseStay({
        hotelId,
        checkInDate,
        checkOutDate,
        numberOfGuests: guests,
        roomCount,
        roomIds,
      }),
    );
  }, [
    dispatch,
    hotelId,
    checkInDate,
    checkOutDate,
    guests,
    roomCount,
    roomIds,
  ]);

  /** A new date search clears the prior room choice before fresh availability is shown. */
  function changeDate(value: string, field: "in" | "out") {
    if (field === "in") setCheckIn(value);
    else setCheckOut(value);
    setRoomIds([]);
    setReview(false);
  }

  /** Persist one reservation, then open that reservation and proceed directly to secure payment. */
  async function confirm() {
    if (!valid || reservation.isLoading) return;
    try {
      const booking = await reserve({
        checkInDate,
        checkOutDate,
        numberOfGuests: guests,
        roomIds: selected.map((room) => room.id),
      }).unwrap();
      dispatch(clearStay());
      navigate("/bookings/" + booking.id + "?checkout=1", { replace: true });
    } catch {
      /* The form retains the draft and displays the backend's validation message. */
    }
  }
  return (
    <main className="section checkout-page" id="main" tabIndex={-1}>
      <Heading eyebrow="COMPLETE YOUR STAY">
        {review ? "Review your reservation." : "Make yourself at home."}
      </Heading>
      <ol className="booking-progress" aria-label="Booking progress">
        <li className={!review ? "current" : "complete"}>1 · Stay details</li>
        <li className={review ? "current" : ""}>2 · Review</li>
        <li>3 · Reservation {"&"} payment</li>
      </ol>
      <Feedback
        loading={hotel.isLoading}
        error={hotel.error}
        retry={hotel.refetch}
      />
      <div className="checkout-grid">
        <section className="border-card stack">
          <h2>{review ? "Your stay details" : "Guest & stay details"}</h2>
          {review ? (
            <>
              <p>
                {user?.name} · {user?.email}
              </p>
              <p>
                {dateLabel(checkInDate)} – {dateLabel(checkOutDate)}
              </p>
              <p>
                {guests} guests · {selected.length} rooms
              </p>
              {selected.map((room) => (
                <p key={room.id}>
                  {room.roomType} · {room.roomNumber}
                </p>
              ))}
              <p className="notice">
                Continue to secure payment to confirm your stay. Your selected
                rooms will be reserved immediately.
              </p>
              <Feedback error={reservation.error} />
              {!valid && !available.isFetching && (
                <p className="notice error">
                  Availability has changed. Edit your stay details to review the
                  available rooms.
                </p>
              )}
              <button
                className="button"
                disabled={!valid || reservation.isLoading}
                onClick={confirm}
              >
                {reservation.isLoading
                  ? "Submitting…"
                  : "Continue to secure payment"}
              </button>
              <button
                className="button outline"
                disabled={reservation.isLoading}
                onClick={() => setReview(false)}
              >
                Edit stay details
              </button>
            </>
          ) : (
            <>
              <div className="grid two">
                <Field label="Full name">
                  <input readOnly value={user?.name || ""} />
                </Field>
                <Field label="Email">
                  <input readOnly value={user?.email || ""} />
                </Field>
              </div>
              <div className="grid two">
                <Field label="Check-in">
                  <input
                    type="date"
                    required
                    min={today()}
                    value={checkInDate}
                    onChange={(event) => changeDate(event.target.value, "in")}
                  />
                </Field>
                <Field label="Check-out">
                  <input
                    type="date"
                    required
                    min={checkInDate || today()}
                    value={checkOutDate}
                    onChange={(event) => changeDate(event.target.value, "out")}
                  />
                </Field>
                <Field label="Guests">
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000"
                    value={guests}
                    onChange={(event) => setGuests(Number(event.target.value))}
                  />
                </Field>
                <Field label="Rooms">
                  <input
                    type="number"
                    required
                    min="1"
                    max="20"
                    value={roomCount}
                    onChange={(event) => {
                      setRoomCount(Number(event.target.value));
                      setRoomIds([]);
                    }}
                  />
                </Field>
              </div>
              {!datesValid && (
                <p className="notice">
                  Choose check-in and check-out dates to see available rooms.
                </p>
              )}
              {nights > 365 && (
                <p className="notice error">
                  Choose a stay of up to 365 nights.
                </p>
              )}
              <Feedback
                loading={available.isFetching}
                error={datesValid ? available.error : undefined}
                retry={datesValid ? available.refetch : undefined}
              />
              {datesValid && available.currentData && !available.isFetching && (
                <fieldset className="room-selection">
                  <legend>
                    Select {roomCount} {roomCount === 1 ? "room" : "rooms"}
                  </legend>
                  {available.currentData.length === 0 && (
                    <p className="notice">
                      No rooms are available for these dates.
                    </p>
                  )}
                  {available.currentData.map((room) => (
                    <label className="room-option" key={room.id}>
                      <input
                        type="checkbox"
                        checked={roomIds.includes(room.id)}
                        onChange={(event) =>
                          setRoomIds(
                            event.target.checked
                              ? [...roomIds, room.id]
                              : roomIds.filter((value) => value !== room.id),
                          )
                        }
                      />
                      <span>
                        <strong>
                          {room.roomType} · {room.roomNumber}
                        </strong>
                        <span>
                          {money(room.pricePerNight)} / night · Sleeps{" "}
                          {room.capacity}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {selected.length > 0 && selected.length !== roomCount && (
                <p className="notice">
                  Select exactly {roomCount} rooms, or change the requested
                  number of rooms.
                </p>
              )}
              {selected.length > 0 && capacity < guests && (
                <p className="notice error">
                  Your selected rooms sleep {capacity}. Choose enough capacity
                  for {guests} guests.
                </p>
              )}
              <button
                className="button"
                disabled={!valid}
                onClick={() => setReview(true)}
              >
                Review reservation
              </button>
            </>
          )}
          <Link
            className="explore-link"
            to={
              "/hotels/" +
              hotelId +
              (params.size ? "?" + params.toString() : "")
            }
          >
            <ArrowLeft className="ui-icon" aria-hidden="true" /> Back to hotel
          </Link>
        </section>
        <aside className="border-card booking-summary stack">
          <p className="eyebrow">BOOKING SUMMARY</p>
          <h2>{hotel.data?.name}</h2>
          {hotel.data && (
            <img
              className="summary-photo"
              src={
                hotel.data.coverImage?.imageUrl ||
                hotel.data.images?.[0]?.imageUrl ||
                "/images/figma/room.png"
              }
              alt={hotel.data.name}
            />
          )}
          <dl className="summary-lines">
            <div>
              <dt>Check-in</dt>
              <dd>{checkInDate ? dateLabel(checkInDate) : "Choose a date"}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>
                {checkOutDate ? dateLabel(checkOutDate) : "Choose a date"}
              </dd>
            </div>
            <div>
              <dt>Guests / rooms</dt>
              <dd>
                {guests} guests · {selected.length} / {roomCount} rooms selected
              </dd>
            </div>
            <div>
              <dt>Nights</dt>
              <dd>{nights}</dd>
            </div>
            {selected.map((room) => (
              <div key={room.id}>
                <dt>{room.roomType}</dt>
                <dd>{money(room.pricePerNight)} / night</dd>
              </div>
            ))}
          </dl>
          <div className="summary-total">
            <p className="eyebrow">ESTIMATED TOTAL</p>
            <p className="price">{money(estimate)}</p>
          </div>
          <p className="muted">
            Your room availability and final total are checked when you continue
            to payment.
          </p>
        </aside>
      </div>
    </main>
  );
}
