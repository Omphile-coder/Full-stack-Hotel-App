import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { Hotel } from "../../lib/types";
import { ConfirmDialog, Feedback, Field, Heading } from "../shared/Shared";

/** Full accommodation form supplements the Figma fields with required location and policy data. */
export function HotelForm({ hotel }: { hotel?: Hotel }) {
  const [write, state] = api.useWriteHotelMutation();
  const [unpublish, removeState] = api.useUnpublishHotelMutation();
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) || "").trim();
    const body: Partial<Hotel> = {
      name: text("name"),
      city: text("city"),
      tagline: text("tagline") || null,
      description: text("description"),
      address: text("address"),
      latitude: Number(form.get("latitude")),
      longitude: Number(form.get("longitude")),
      starRating: Number(form.get("starRating")),
      facilities: text("facilities")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      policies: text("policies"),
      phoneNumber: text("phoneNumber") || null,
      email: text("email") || null,
      isPublished: form.get("isPublished") === "on",
      images: text("images")
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((imageUrl, sortOrder) => ({
          imageUrl,
          sortOrder,
          altText: text("name"),
        })),
    };
    try {
      await write({ id: hotel?.id, body }).unwrap();
      navigate("/admin/hotels", { state: { message: "Accommodation saved." } });
    } catch {
      /* Preserve user-entered form data after validation or network errors. */
    }
  }
  async function remove() {
    if (!hotel) return;
    try {
      await unpublish(hotel.id).unwrap();
      navigate("/admin/hotels");
    } catch {
      /* The confirmation dialog keeps the API error visible. */
    }
  }
  return (
    <main className="section form-page wide-form" id="main" tabIndex={-1}>
      <Heading eyebrow="ACCOMMODATIONS">
        {hotel ? "A fresh perspective." : "A new place to stay."}
      </Heading>
      <form className="stack" onSubmit={save}>
        <Field label="Name">
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={hotel?.name}
          />
        </Field>
        <Field label="City">
          <input
            name="city"
            required
            maxLength={100}
            defaultValue={hotel?.city}
          />
        </Field>
        <Field label="Tagline">
          <input
            name="tagline"
            maxLength={200}
            defaultValue={hotel?.tagline || ""}
          />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            required
            maxLength={5000}
            rows={4}
            defaultValue={hotel?.description}
          />
        </Field>
        <label className="check">
          <input
            name="isPublished"
            type="checkbox"
            defaultChecked={hotel?.isPublished}
          />{" "}
          Published · Visible to guests
        </label>
        <Field label="Address">
          <input
            name="address"
            required
            maxLength={300}
            defaultValue={hotel?.address}
          />
        </Field>
        <div className="grid two">
          <Field label="Latitude">
            <input
              name="latitude"
              required
              type="number"
              min="-90"
              max="90"
              step="0.000001"
              defaultValue={hotel?.latitude}
            />
          </Field>
          <Field label="Longitude">
            <input
              name="longitude"
              required
              type="number"
              min="-180"
              max="180"
              step="0.000001"
              defaultValue={hotel?.longitude}
            />
          </Field>
        </div>
        <Field label="Star rating">
          <select name="starRating" defaultValue={hotel?.starRating || 4}>
            {[1, 2, 3, 4, 5].map((star) => (
              <option key={star} value={star}>
                {star} stars
              </option>
            ))}
          </select>
        </Field>
        <Field label="Facilities (separated by commas)">
          <textarea
            name="facilities"
            rows={2}
            defaultValue={hotel?.facilities.join(", ")}
          />
        </Field>
        <Field label="Policies">
          <textarea
            name="policies"
            required
            maxLength={5000}
            rows={3}
            defaultValue={hotel?.policies}
          />
        </Field>
        <Field label="Phone number">
          <input
            name="phoneNumber"
            type="tel"
            maxLength={200}
            defaultValue={hotel?.phoneNumber || ""}
          />
        </Field>
        <Field label="Contact email">
          <input
            name="email"
            type="email"
            maxLength={200}
            defaultValue={hotel?.email || ""}
          />
        </Field>
        <Field label="Gallery image URLs (one per line, up to 30)">
          <textarea
            name="images"
            rows={5}
            defaultValue={hotel?.images
              ?.map((image) => image.imageUrl)
              .join("\n")}
          />
        </Field>
        <Feedback error={state.error} />
        <button className="button" disabled={state.isLoading}>
          {state.isLoading ? "Saving…" : "Save accommodation"}
        </button>
        <Link className="button outline" to="/admin/hotels">
          Cancel
        </Link>
      </form>
      {hotel?.isPublished && (
        <button
          className="button outline danger spaced"
          onClick={() => setConfirm(true)}
        >
          Unpublish accommodation
        </button>
      )}
      {confirm && (
        <ConfirmDialog
          title="Unpublish this accommodation?"
          onClose={() => setConfirm(false)}
          onConfirm={remove}
          busy={removeState.isLoading}
          error={removeState.error}
        >
          <p>Guests will no longer see {hotel?.name} in the public listings.</p>
        </ConfirmDialog>
      )}
    </main>
  );
}
