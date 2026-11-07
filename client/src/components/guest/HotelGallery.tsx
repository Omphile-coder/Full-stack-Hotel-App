import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { HotelImage } from "../../lib/types";

/** Gallery previews link to the full, shareable photo page without replacing the source imagery. */
export function HotelGallery({
  id,
  hotelName,
  photos,
}: {
  id: string;
  hotelName: string;
  photos: HotelImage[];
}) {
  return (
    <section className="section gallery-preview">
      <Link className="gallery-grid" to={"/hotels/" + id + "/photos"}>
        {photos.slice(0, 2).map((photo, index) => (
          <img
            key={photo.imageUrl + index}
            src={photo.imageUrl}
            alt={photo.altText || hotelName + " photograph " + (index + 1)}
            loading="lazy"
          />
        ))}
      </Link>
      <Link className="explore-link" to={"/hotels/" + id + "/photos"}>
        View all photographs{" "}
        <ArrowRight className="ui-icon" aria-hidden="true" />
      </Link>
    </section>
  );
}
