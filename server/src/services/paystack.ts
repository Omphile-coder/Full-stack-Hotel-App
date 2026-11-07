import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../api.js";

export interface PaystackTransaction { reference: string; status: string; amount: number; currency: string }
interface PaystackEnvelope<T> { status: boolean; data: T }
export interface InitializedCheckout { reference: string; authorization_url: string }

/** Only the server holds the secret key or contacts the transaction API. */
export function paystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new ApiError(503, "Paystack checkout is not configured");
  return key;
}

/** Return to the configured frontend, never a client-supplied redirect URL. */
export function paymentCallback() {
  const client = new URL(process.env.CLIENT_URL ?? "http://localhost:5173");
  const url = new URL(process.env.PAYSTACK_CALLBACK_URL || "/payments/callback", client);
  if (url.origin !== client.origin || (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new ApiError(503, "Paystack callback must use the configured frontend origin");
  }
  return url.href;
}

/** Reject malformed references before querying storage or contacting the provider. */
export function paymentReference(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9.=-]{10,100}$/.test(value)) throw new ApiError(400, "Invalid payment reference");
  return value;
}

/** Provider failures never log credentials or expose full provider responses. */
async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const key = paystackKey();
  try {
    const response = await fetch("https://api.paystack.co/transaction/" + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 || response.status === 403) throw new ApiError(503, "Paystack credentials are not accepted. Contact the hotel.");
    const result = await response.json() as PaystackEnvelope<T>;
    if (response.ok && result.status === true && result.data) return result.data;
  } catch (error) { if (error instanceof ApiError) throw error; }
  throw new ApiError(502, "Unable to reach Paystack. Retry from this reservation; do not create another booking.");
}

/** The stored reservation supplies the amount in cents and currency, never the browser. */
export function initializePaystack(input: { email: string; amount: string; currency: string; reference: string; callback_url: string }) {
  return request<InitializedCheckout>("initialize", input);
}

/** Callers check transaction status and totals, not just the response's HTTP status. */
export function verifyPaystack(reference: string) {
  return request<PaystackTransaction>("verify/" + encodeURIComponent(reference));
}

/** Accept only Paystack's hosted checkout origin as an external payment destination. */
export function checkoutUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname === "checkout.paystack.com" && !url.port && !url.username && !url.password) return url.href;
  } catch { /* Invalid provider responses become a gateway failure. */ }
  throw new ApiError(502, "Paystack returned an invalid checkout link");
}

/** Authenticate exact raw bytes using current or legacy Paystack webhook signatures. */
export function validPaystackSignature(body: Buffer, modern?: string, legacy?: string) {
  const signingSecret = process.env.PAYSTACK_WEBHOOK_SECRET?.trim();
  if (modern || signingSecret) {
    if (!modern || !signingSecret) return false;
    const parts = modern.split(",").map(part => part.trim());
    const timestamps = parts.filter(part => part.startsWith("t="));
    if (timestamps.length !== 1 || !/^t=\d+$/.test(timestamps[0]!)) return false;
    const timestamp = timestamps[0]!.slice(2);
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    const expected = createHmac("sha512", signingSecret).update(timestamp + ".").update(body).digest();
    return parts.some(part => {
      const match = /^v1=whk_[a-zA-Z0-9]+:([a-f0-9]{128})$/.exec(part);
      return Boolean(match && timingSafeEqual(expected, Buffer.from(match[1]!, "hex")));
    });
  }
  const key = paystackKey();
  return Boolean(legacy && /^[a-f0-9]{128}$/i.test(legacy) && timingSafeEqual(
    createHmac("sha512", key).update(body).digest(), Buffer.from(legacy, "hex")));
}
