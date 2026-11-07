import { ArrowRight } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { hotelPhoto,money } from '../../lib/format';
import type { Hotel } from '../../lib/types';

/** Real hotel data is displayed using the same card geometry as the Figma location cards. */
export function HotelCard({
  hotel,
  home = false,
  search = "",
  children,
}: PropsWithChildren<{ hotel: Hotel; home?: boolean; search?: string }>) {
  const href = "/hotels/" + hotel.id + (search ? "?" + search : "");
  return (
    <article className={"hotel-card " + (home ? "home-card" : "")}>
      <Link to={href} aria-label={"View " + hotel.name}>
        <img
          src={hotelPhoto(hotel)}
          alt={hotel.coverImage?.altText || hotel.name}
          loading="lazy"
        />
      </Link>
      <p className="eyebrow">{hotel.city}</p>
      <h2>
        <Link to={href}>{hotel.name}</Link>
      </h2>
      <p className="muted">{hotel.tagline}</p>
      {!home && (
        <p>
          {hotel.fromPrice
            ? "From " + money(hotel.fromPrice) + " / night"
            : "Contact us for room availability"}
        </p>
      )}
      {children}
      <Link className={home ? "explore-link" : "button outline"} to={href}>
        {home ? <>Explore location <ArrowRight className="ui-icon" aria-hidden="true" /></> : "View hotel"}
      </Link>
    </article>
  );
}
