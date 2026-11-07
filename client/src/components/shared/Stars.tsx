import { Star } from "lucide-react";

/** Decorative SVG stars retain a single readable rating for assistive technology. */
export function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="star-rating"
      role="img"
      aria-label={rating + " out of 5 stars"}
    >
      {Array.from({ length: rating }, (_, index) => (
        <Star
          key={index}
          className="ui-icon"
          fill="currentColor"
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
