import { Stars } from "../components/shared/Stars";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Heart,
  MapPin,
  Check,
} from "lucide-react";
import { bookingLabel } from "../lib/bookingStatus";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { AccountNavigation } from "../components/guest/AccountNavigation";
import { StayForm } from "../components/guest/BookingForm";
import { StaySummary } from "../components/guest/BookingSummary";
import { BottomNav } from "../components/guest/BottomNav";
import { GuestFooter } from "../components/guest/GuestFooter";
import { Hero } from "../components/guest/Hero";
import { HotelCard } from "../components/guest/HotelCard";
import { HotelFacilities } from "../components/guest/HotelFacilities";
import { HotelGallery } from "../components/guest/HotelGallery";
import { HotelPolicies } from "../components/guest/HotelPolicies";
import { Reviews } from "../components/guest/HotelReviews";
import { SearchForm } from "../components/guest/HotelSearch";
import { ProfileForm } from "../components/guest/ProfileForm";
import { ProfileLinks } from "../components/guest/ProfileLinks";
import { RoomCard } from "../components/guest/RoomCard";
import { ShareDialog } from "../components/guest/ShareHotel";
import { StayCard } from "../components/guest/StayCard";
import {
  Feedback,
  Field,
  Heading,
  Pagination,
} from "../components/shared/Shared";
import { useSignOut } from "../hooks/useSignOut";
import { api } from "../lib/api";
import { dateLabel, hotelPhoto, money } from "../lib/format";

/** Landing page follows the separate desktop and mobile photographic hero compositions. */
export function Home() {
  const hotels = api.useHotelsQuery({});
  return (
    <>
      <Hero />
      <main id="main" tabIndex={-1}>
        <section className="section home-intro">
          <Heading eyebrow="FIND YOUR NEXT STAY">A place to call home.</Heading>
          <SearchForm />
          <div className="actions spaced">
            <Link className="button outline" to="/hotels">
              Explore all locations
            </Link>
            <Link className="button outline" to="/profile">
              My profile & favourites
            </Link>
          </div>
        </section>
        <section className="section home-locations">
          <Heading eyebrow="OUR LOCATIONS">Where to find us</Heading>
          <Feedback
            loading={hotels.isLoading}
            error={hotels.error}
            retry={hotels.refetch}
          />
          <div className="grid three">
            {hotels.data?.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} home />
            ))}
          </div>
          {hotels.data?.length === 0 && (
            <p className="notice">
              Our locations will appear here when they are published.
            </p>
          )}
        </section>
      </main>
      <GuestFooter />
      <BottomNav />
    </>
  );
}

/** URL-backed filters keep search results shareable and preserve browser back navigation. */
export function Hotels() {
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const query = Object.fromEntries(
    [...params].filter(([key]) =>
      [
        "location",
        "minPrice",
        "maxPrice",
        "minStars",
        "minCapacity",
        "offset",
      ].includes(key),
    ),
  );
  const hotels = api.useHotelsQuery(query);
  return (
    <main className="section" id="main" tabIndex={-1}>
      <Heading eyebrow="OUR LOCATIONS">Where would you like to stay?</Heading>
      <SearchForm key={params.toString()} params={params} />
      <Feedback
        loading={hotels.isLoading}
        error={hotels.error}
        retry={hotels.refetch}
      />
      {hotels.data && (
        <>
          <p className="muted result-count" role="status">
            {hotels.data.length} locations on this page ·{" "}
            {params.get("location") || "South Africa"}
          </p>
          {hotels.data.length ? (
            <div className="grid three">
              {hotels.data.map((hotel) => (
                <StayCard key={hotel.id} hotel={hotel} params={params} />
              ))}
            </div>
          ) : (
            <p className="notice">
              No stays match these filters. Try another location or budget.
            </p>
          )}
          <Pagination
            offset={offset}
            count={hotels.data.length}
            setOffset={(value) => {
              const next = new URLSearchParams(params);
              next.set("offset", String(value));
              setParams(next);
            }}
          />
        </>
      )}
      {params.size > 0 && (
        <Link className="button outline spaced" to="/hotels">
          Clear filters
        </Link>
      )}
    </main>
  );
}

/** Guests edit their profile or move directly into the other account workflows. */
export function Profile() {
  const { data: user } = api.useMeQuery();
  const { signOut, error, isLoading } = useSignOut();
  return (
    <main className="section account-page" id="main" tabIndex={-1}>
      <Heading eyebrow="YOUR ACCOUNT">Welcome, {user?.name}</Heading>
      <ProfileLinks />
      {user && <ProfileForm key={user.id} user={user} />}
      <Feedback error={error} />
      <div className="actions spaced">
        {user?.role === "ADMIN" && (
          <Link className="button" to="/admin">
            Open admin dashboard
          </Link>
        )}
        <button
          className="button outline"
          disabled={isLoading}
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

/** A dedicated favourites page keeps browsing and removal in the same shortlist flow. */
export function Favourites() {
  const [offset, setOffset] = useState(0);
  const favorites = api.useFavoritesQuery(offset);
  const [remove, state] = api.useSaveFavoriteMutation();
  return (
    <main className="section account-page" id="main" tabIndex={-1}>
      <Heading
        eyebrow="YOUR SHORTLIST"
        subtitle="The places you would love to come back to."
      >
        Favourite stays
      </Heading>
      <AccountNavigation />
      <Feedback
        loading={favorites.isLoading}
        error={favorites.error || state.error}
        retry={favorites.refetch}
      />
      <div className="grid three spaced">
        {favorites.data?.map((item) => (
          <div className="stack" key={item.id}>
            <HotelCard hotel={item.accommodation} />
            <button
              className="text-button"
              disabled={state.isLoading}
              onClick={() => remove({ id: item.accommodationId, saved: true })}
            >
              Remove favourite
            </button>
          </div>
        ))}
      </div>
      {favorites.data?.length === 0 && (
        <div className="empty-state">
          <h2>A stay worth saving.</h2>
          <p>Tap Save on a hotel to keep it in your shortlist.</p>
          <Link className="button" to="/hotels">
            Explore locations
          </Link>
        </div>
      )}
      <Pagination
        offset={offset}
        count={favorites.data?.length || 0}
        setOffset={setOffset}
      />
    </main>
  );
}

/** Guests browse reservations on a separate page and open an existing booking to pay. */
export function MyBookings() {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const bookings = api.useBookingsQuery(offset, { refetchOnFocus: true });
  const items =
    bookings.data?.filter(
      (booking) => !status || bookingLabel(booking) === status,
    ) || [];
  return (
    <main className="section account-page" id="main" tabIndex={-1}>
      <Heading
        eyebrow="YOUR STAYS"
        subtitle="Track your reservation, review its details, and complete secure payment."
      >
        My bookings
      </Heading>
      <AccountNavigation />
      <div className="list-toolbar">
        <Field label="Filter this page by status">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="Awaiting payment">Awaiting payment</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </Field>
        <Link className="button outline" to="/hotels">
          Book another stay
        </Link>
      </div>
      <Feedback
        loading={bookings.isLoading}
        error={bookings.error}
        retry={bookings.refetch}
      />
      <div className="stack">
        {items.map((booking) => {
          const paid = booking.payments.some(
            (payment) => payment.status === "COMPLETED",
          );
          return (
            <article className="border-card booking-list-card" key={booking.id}>
              <div className="stack">
                <span className="status-label">{bookingLabel(booking)}</span>
                <h2>{booking.bookingRooms[0]?.room.accommodation.name}</h2>
                <p>
                  {dateLabel(booking.checkInDate)} –{" "}
                  {dateLabel(booking.checkOutDate)}
                </p>
                <p className="muted">
                  {booking.numberOfGuests} guests ·{" "}
                  {booking.bookingRooms.length} rooms
                </p>
                <p className="reference">{booking.id}</p>
              </div>
              <div className="stack booking-card-action">
                <p className="price">{money(booking.totalPrice)}</p>
                <p>{paid ? "Paid" : "Payment pending"}</p>
                <Link className="button" to={"/bookings/" + booking.id}>
                  {booking.status !== "CANCELLED" && !paid
                    ? "View & pay"
                    : "View booking"}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      {bookings.data && items.length === 0 && (
        <div className="empty-state">
          <h2>
            {status
              ? "No matching stays on this page."
              : "Your next stay starts here."}
          </h2>
          <Link className="button" to="/hotels">
            Find a stay
          </Link>
        </div>
      )}
      <Pagination
        offset={offset}
        count={bookings.data?.length || 0}
        setOffset={setOffset}
      />
    </main>
  );
}

/** A notification opens its related reservation and can be marked read independently. */
export function Notifications() {
  const [offset, setOffset] = useState(0);
  const notifications = api.useNotificationsQuery(offset, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true,
  });
  const [read, state] = api.useReadNotificationMutation();
  return (
    <main className="section account-page" id="main" tabIndex={-1}>
      <Heading
        eyebrow="KEEP IN TOUCH"
        subtitle="Booking updates and news from Halden."
      >
        Your notifications
      </Heading>
      <AccountNavigation />
      <Feedback
        loading={notifications.isLoading}
        error={notifications.error || state.error}
        retry={notifications.refetch}
      />
      <div className="stack spaced">
        {notifications.data?.map((item) => (
          <article
            className={
              "border-card notification-card " +
              (item.userId && !item.readAt ? "unread" : "")
            }
            key={item.id}
          >
            <p>{item.message}</p>
            <p className="muted">{dateLabel(item.createdAt)}</p>
            <div className="actions">
              {item.bookingId && (
                <Link
                  className="explore-link"
                  to={"/bookings/" + item.bookingId}
                >
                  View reservation{" "}
                  <ArrowRight className="ui-icon" aria-hidden="true" />
                </Link>
              )}
              {item.userId && !item.readAt && (
                <button
                  className="text-button"
                  disabled={state.isLoading}
                  onClick={() => read(item.id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {notifications.data?.length === 0 && (
        <p className="notice">Your booking updates will appear here.</p>
      )}
      <Pagination
        offset={offset}
        count={notifications.data?.length || 0}
        setOffset={setOffset}
      />
    </main>
  );
}

/** Hotel details combine live inventory with the photo-led Figma layout. */
export function HotelPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const staySearch = params.toString();
  const bookPath =
    "/hotels/" + id + "/book" + (staySearch ? "?" + staySearch : "");
  /** Room selection retains the dates and party size supplied by the search flow. */
  function roomPath(roomId: string) {
    const next = new URLSearchParams(params);
    next.set("room", roomId);
    return "/hotels/" + id + "/book?" + next.toString();
  }
  const hotel = api.useHotelQuery(id);
  const { data: user } = api.useMeQuery();
  const favorites = api.useFavoriteStatusQuery(id, { skip: !user });
  const [save, saveState] = api.useSaveFavoriteMutation();
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const saved = favorites.data ?? false;

  /** Save through the API so favourites are available across devices. */
  async function toggleSave() {
    if (!user)
      return navigate(
        "/signin?next=" +
          encodeURIComponent(
            "/hotels/" + id + (staySearch ? "?" + staySearch : ""),
          ),
      );
    try {
      await save({ id, saved }).unwrap();
    } catch {
      /* Mutation feedback is rendered below. */
    }
  }

  /** Copy a canonical hotel URL when the native share sheet is unavailable. */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }
  if (!hotel.data)
    return (
      <main className="section" id="main" tabIndex={-1}>
        <Feedback
          loading={hotel.isLoading}
          error={hotel.error}
          retry={hotel.refetch}
        />
      </main>
    );
  const data = hotel.data;
  const photos = data.images?.length
    ? data.images
    : [{ imageUrl: hotelPhoto(data), altText: data.name }];
  return (
    <main id="main" tabIndex={-1}>
      <Link
        to={"/hotels/" + id + "/photos"}
        className="hotel-hero"
        style={{
          backgroundImage:
            'linear-gradient(0deg, rgb(0 0 0 / 48%), transparent 70%), url("' +
            hotelPhoto(data) +
            '")',
        }}
      >
        <p className="eyebrow">
          <Stars rating={data.starRating} /> · {data.city}, South Africa
        </p>
        <h1>{data.name}</h1>
        <p>{data.tagline}</p>
      </Link>
      <section className="section hotel-actions">
        <div className="actions">
          <Link className="button outline" to="/hotels">
            <ArrowLeft className="ui-icon" aria-hidden="true" /> Back to
            listings
          </Link>
          <Link className="button" to={bookPath}>
            Book this stay
          </Link>
          <Link className="button outline" to="/favourites">
            My favourites
          </Link>
        </div>
      </section>
      <section className="section hotel-information">
        <div className="actions">
          <button
            className="button outline"
            disabled={saveState.isLoading || favorites.isFetching}
            onClick={toggleSave}
            aria-pressed={saved}
          >
            <Heart
              className="ui-icon"
              aria-hidden="true"
              fill={saved ? "currentColor" : "none"}
            />
            {saved ? "Saved" : "Save"}
          </button>
          <button className="button outline" onClick={() => setShare(true)}>
            Share
          </button>
        </div>
        <Feedback error={saveState.error || favorites.error} />
        <div className="hotel-columns">
          <div className="stack">
            <p className="serif intro">{data.description}</p>
            <HotelFacilities facilities={data.facilities} />
            <HotelPolicies policies={data.policies} />
          </div>
          <aside className="stack">
            <p className="eyebrow">CONTACT</p>
            <p>
              {data.address}
              <br />
              {data.phoneNumber && (
                <>
                  <a href={"tel:" + data.phoneNumber}>{data.phoneNumber}</a>
                  <br />
                </>
              )}
              {data.email && <a href={"mailto:" + data.email}>{data.email}</a>}
            </p>
            <a
              className="map-card"
              href={
                "https://www.google.com/maps/search/?api=1&query=" +
                encodeURIComponent(data.latitude + "," + data.longitude)
              }
              target="_blank"
              rel="noreferrer"
            >
              <span className="serif">
                <MapPin className="ui-icon" aria-hidden="true" /> {data.city}
              </span>
              <span>
                View location map{" "}
                <ArrowUpRight className="ui-icon" aria-hidden="true" />
              </span>
            </a>
          </aside>
        </div>
      </section>
      <HotelGallery id={id} hotelName={data.name} photos={photos} />
      <section className="section">
        <Heading eyebrow="STAY">Rooms {"&"} suites</Heading>
        <div className="grid three">
          {data.rooms?.map((room) => (
            <RoomCard key={room.id} room={room} to={roomPath(room.id)} />
          ))}
        </div>
        {data.rooms?.length === 0 && (
          <p className="notice">
            Rooms are currently unavailable. Please check again soon.
          </p>
        )}
      </section>
      <Reviews hotelId={id} />
      {share && (
        <ShareDialog
          name={data.name}
          copied={copied}
          copyError={copyError}
          onCopy={copyLink}
          onClose={() => setShare(false)}
        />
      )}
    </main>
  );
}

/** Full photo gallery uses images returned by the backend and supports direct links. */
export function Photos() {
  const { id = "" } = useParams();
  const hotel = api.useHotelQuery(id);
  return (
    <main className="section" id="main" tabIndex={-1}>
      <Heading eyebrow="PHOTO GALLERY">
        {hotel.data?.name || "A closer look."}
      </Heading>
      <Link className="button outline" to={"/hotels/" + id}>
        <ArrowLeft className="ui-icon" aria-hidden="true" /> Back to hotel
      </Link>
      <Feedback
        loading={hotel.isLoading}
        error={hotel.error}
        retry={hotel.refetch}
      />
      <div className="photo-gallery">
        {hotel.data?.images?.map((photo, index) => (
          <figure key={photo.imageUrl + index}>
            <img
              src={photo.imageUrl}
              alt={
                photo.altText || hotel.data?.name + " photograph " + (index + 1)
              }
            />
            <figcaption>{photo.altText}</figcaption>
          </figure>
        ))}
      </div>
      {hotel.data?.images?.length === 0 && (
        <p className="notice">More photographs are coming soon.</p>
      )}
    </main>
  );
}

/** Confirmations poll the API after checkout because only server verification proves payment. */
export function BookingPage() {
  const { id = "" } = useParams();
  const booking = api.useBookingQuery(id, {
    pollingInterval: 10000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
  });
  const [checkout, state] = api.useCheckoutMutation();
  const [verifyPayment, verification] = api.useVerifyPaymentMutation();
  const [redirecting, setRedirecting] = useState(false);
  const [params] = useSearchParams();
  const attemptedCheckout = useRef<string | null>(null);
  const [openedAt] = useState(Date.now);
  const pay = useCallback(async () => {
    try {
      const result = await checkout(id).unwrap();
      setRedirecting(true);
      window.location.assign(result.url);
    } catch {
      /* Show provider and booking validation feedback below. */
    }
  }, [checkout, id]);
  const data = booking.currentData;
  const paid = data?.payments.some((payment) => payment.status === "COMPLETED");
  const cancelled = data?.status === "CANCELLED";
  const checkoutAvailable = Boolean(
    data &&
    !cancelled &&
    !paid &&
    new Date(data.checkOutDate).getTime() > openedAt,
  );
  /** Recover payment confirmation even when the return redirect or webhook was delayed. */
  async function refreshPayment() {
    const pending = data?.payments.find(
      (payment) =>
        payment.provider === "paystack" && payment.status === "PENDING",
    );
    if (pending?.providerReference)
      await verifyPayment(pending.providerReference);
    await booking.refetch();
  }
  const autoCheckout = params.get("checkout") === "1";
  // Attempt checkout once after creation; failures leave this saved reservation available for retry.
  useEffect(() => {
    if (!autoCheckout || !checkoutAvailable || attemptedCheckout.current === id)
      return;
    attemptedCheckout.current = id;
    void pay();
  }, [autoCheckout, checkoutAvailable, id, pay]);
  return (
    <main className="section form-page" id="main" tabIndex={-1}>
      <Heading eyebrow={paid ? "STEP 3 OF 3 · CONFIRMED" : "YOUR RESERVATION"}>
        {cancelled
          ? "Reservation cancelled."
          : paid
            ? "Your stay is booked."
            : checkoutAvailable
              ? "One last step."
              : "Your stay details."}
      </Heading>
      <Feedback
        loading={booking.isLoading}
        error={booking.error}
        retry={booking.refetch}
      />
      {data && (
        <>
          <p className="reference">Booking reference {data.id}</p>
          <StaySummary booking={data} />
          <p className="status-label">{bookingLabel(data)}</p>
          {paid && !cancelled ? (
            <p className="notice success">
              Payment confirmed. Your booking updates are available in your
              profile.
            </p>
          ) : checkoutAvailable ? (
            <>
              <p className="notice">
                Continue to Paystack to securely complete your payment.
              </p>
              <Feedback error={state.error || verification.error} />
              <button
                className="button"
                disabled={state.isLoading || redirecting}
                onClick={pay}
              >
                {state.isLoading || redirecting
                  ? "Opening checkout…"
                  : "Continue to secure payment"}
              </button>
            </>
          ) : (
            !cancelled && (
              <p className="notice">
                The checkout date has passed. Contact the hotel for help with
                this reservation.
              </p>
            )
          )}
          <button
            className="button outline"
            disabled={booking.isFetching || verification.isLoading}
            onClick={refreshPayment}
          >
            Refresh status
          </button>
        </>
      )}
      <Link className="button" to="/bookings">
        View my bookings
      </Link>
      <Link className="button outline" to="/hotels">
        Explore more locations
      </Link>
    </main>
  );
}

/** A hotel-specific key gives each checkout its own selection while retaining the shared stay draft. */
export function BookStay() {
  const { id = "" } = useParams();
  return <StayForm key={id} hotelId={id} />;
}

/** Show the reference flow's sign-in/sign-out outcome with the existing brand styling. */
export function AuthSuccess({ signedOut = false }: { signedOut?: boolean }) {
  return (
    <main className="section form-page success-page" id="main" tabIndex={-1}>
      <p className="eyebrow">YOUR ACCOUNT</p>
      <span className="success-mark" aria-hidden="true">
        <Check />
      </span>
      <h1>
        {signedOut ? "Successfully signed out." : "Successfully signed in."}
      </h1>
      <p className="muted">
        {signedOut
          ? "We hope to welcome you back soon."
          : "Your stays, favourite hotels, and updates are all in your account."}
      </p>
      <Link className="button" to={signedOut ? "/" : "/profile"}>
        {signedOut ? "Back to home" : "Continue to my profile"}
      </Link>
      {!signedOut && (
        <Link className="button outline" to="/hotels">
          Explore our locations
        </Link>
      )}
    </main>
  );
}
