import { GuestNavbar } from "./GuestNavbar";

/** The photographic landing hero preserves the original image, colours, and font styles. */
export function Hero() {
  return (
    <div className="home-hero">
      <GuestNavbar hero />
      <div className="hero-copy">
        <p className="eyebrow">EST. 1998 · SOUTH AFRICA</p>
        <h1>One hotel. Many homes.</h1>
        <p>The same quiet hospitality, wherever you arrive.</p>
      </div>
    </div>
  );
}
