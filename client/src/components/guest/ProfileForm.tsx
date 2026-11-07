import type { FormEvent } from "react";
import { useState } from "react";
import { useSession } from "../../hooks/useSession";
import { api } from "../../lib/api";
import type { User } from "../../lib/types";
import { Feedback, Field } from "../shared/Shared";

/** Profile editing is a dedicated account task, separate from reservations and saved hotels. */
export function ProfileForm({ user }: { user: User }) {
  const [save, state] = api.useUpdateMeMutation();
  const { toast } = useSession();
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaved(false);
    try {
      await save({
        name: String(form.get("name")),
        phoneNumber: String(form.get("phoneNumber")).trim() || null,
      }).unwrap();
      setSaved(true);
      toast("Your profile was updated.");
    } catch {
      /* Keep the entered details available while the guest corrects an error. */
    }
  }
  return (
    <form className="stack profile-form" onSubmit={submit}>
      <h2>Personal details</h2>
      <Field label="Full name">
        <input name="name" defaultValue={user.name} required maxLength={100} />
      </Field>
      <Field label="Email">
        <input readOnly value={user.email} />
      </Field>
      <Field label="Phone number">
        <input
          name="phoneNumber"
          type="tel"
          defaultValue={user.phoneNumber || ""}
          maxLength={32}
        />
      </Field>
      <Feedback error={state.error} />
      <p role="status">{saved ? "Your details were saved." : ""}</p>
      <button className="button" disabled={state.isLoading}>
        {state.isLoading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
