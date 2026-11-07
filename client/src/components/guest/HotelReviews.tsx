import { Stars } from "../shared/Stars";
import { ArrowRight } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Feedback, Field, Heading, Pagination } from "../shared/Shared";

/** Paginated reviews use a one-review-per-user upsert and refresh their rating summary. */
export function Reviews({ hotelId }: { hotelId: string }) {
  const [offset, setOffset] = useState(0);
  const { data: user } = api.useMeQuery();
  const reviews = api.useReviewsQuery({ id: hotelId, offset });
  const [write, state] = api.useWriteReviewMutation();
  const [remove, removeState] = api.useDeleteReviewMutation();
  const [success, setSuccess] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await write({
        id: hotelId,
        rating: Number(form.get("rating")),
        comment: String(form.get("comment") || "").trim() || null,
      }).unwrap();
      setSuccess("Your review was saved.");
    } catch {
      setSuccess("");
    }
  }
  return (
    <section className="section reviews">
      <Heading eyebrow="GUEST EXPERIENCES">Reviews {"&"} ratings</Heading>
      <Feedback
        loading={reviews.isLoading}
        error={reviews.error}
        retry={reviews.refetch}
      />
      {reviews.data && (
        <>
          <p>
            {reviews.data.averageRating?.toFixed(1) || "—"} / 5 ·{" "}
            {reviews.data.reviewCount} reviews
          </p>
          <div className="stack">
            {reviews.data.reviews.map((review) => (
              <article className="border-card" key={review.id}>
                <h3>{review.user.name}</h3>
                <p aria-label={review.rating + " out of 5 stars"}>
                  <Stars rating={review.rating} />
                </p>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
          <Pagination
            offset={offset}
            count={reviews.data.reviews.length}
            setOffset={setOffset}
          />
        </>
      )}
      {user ? (
        <form className="stack review-form" onSubmit={submit}>
          <h2>Share your experience</h2>
          <Field label="Rating">
            <select name="rating" defaultValue="5">
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} stars
                </option>
              ))}
            </select>
          </Field>
          <Field label="Your review (optional)">
            <textarea name="comment" maxLength={2000} rows={4} />
          </Field>
          <Feedback error={state.error || removeState.error} />
          <p role="status">{success}</p>
          <div className="actions">
            <button className="button" disabled={state.isLoading}>
              Save review
            </button>
            <button
              type="button"
              className="button outline"
              disabled={removeState.isLoading}
              onClick={async () => {
                try {
                  await remove(hotelId).unwrap();
                  setSuccess("Your review was removed.");
                } catch {
                  setSuccess("");
                }
              }}
            >
              Remove my review
            </button>
          </div>
        </form>
      ) : (
        <Link
          className="explore-link spaced"
          to={"/signin?next=" + encodeURIComponent("/hotels/" + hotelId)}
        >
          Sign in to write a review{" "}
          <ArrowRight className="ui-icon" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
