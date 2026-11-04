import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import prisma from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, send, uuid } from "../api.js";
import { transactionOptions } from "./bookings.js";

interface Checkout {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: string;
  amount_total: number;
  currency: string;
  client_reference_id: string;
}

async function stripe(path: string, key: string, body?: URLSearchParams, id?: string): Promise<Checkout> {
  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions" + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: "Bearer " + key, ...(id ? { "Idempotency-Key": id } : {}) },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) return await response.json() as Checkout;
    console.error("Stripe Checkout returned", response.status);
  } catch (error) {
    console.error("Stripe Checkout request failed", error instanceof Error ? error.name : "unknown");
  }
  throw new ApiError(502, "Payment provider is temporarily unavailable");
}

export const payments = Router();
payments.post("/bookings/:id/checkout", requireAuth, async (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY;
  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!key || !successUrl || !cancelUrl || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(503, "Checkout is not configured");
  }
  const bookingId = uuid(req.params.id);
  const payment = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId, userId: req.user!.id },
      include: { payments: { where: { status: { not: "FAILED" } } } },
    });
    if (booking.status !== "APPROVED" || booking.checkOutDate.getTime() <= Date.now()) {
      throw new ApiError(409, "Checkout requires an approved reservation with a future checkout date");
    }
    if (booking.payments.some((payment) => payment.status === "COMPLETED")) {
      throw new ApiError(409, "Reservation is already paid");
    }
    const pending = booking.payments[0];
    if (pending) {
      if (pending.provider !== "stripe") throw new ApiError(409, "Another payment is already pending");
      return pending;
    }
    return tx.payment.create({ data: { bookingId, amount: booking.totalPrice, provider: "stripe" } });
  }, transactionOptions);

  if (!payment.providerReference && Date.now() - payment.createdAt.getTime() >= 23 * 3600000) {
    throw new ApiError(409, "This checkout attempt requires reconciliation");
  }
  const session = payment.providerReference
    ? await stripe("/" + encodeURIComponent(payment.providerReference), key)
    : await stripe("", key, new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: payment.id,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": payment.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": payment.amount.times(100).toFixed(0),
      "line_items[0][price_data][product_data][name]": "Hotel reservation",
    }), payment.id);
  await prisma.payment.updateMany({
    where: { id: payment.id, status: "PENDING", providerReference: null },
    data: { providerReference: session.id },
  });
  if (session.status === "expired") {
    await settle(session, "FAILED");
    throw new ApiError(409, "Checkout expired. Submit a new checkout request.");
  }
  if (!session.url || session.status !== "open") {
    if (session.payment_status === "paid") await settle(session, "COMPLETED");
    throw new ApiError(409, "Checkout has already ended");
  }
  send(res, { url: session.url, paymentId: payment.id });
});

async function settle(session: Checkout, status: "COMPLETED" | "FAILED") {
  const id = uuid(session.client_reference_id);
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id }, include: { booking: true } });
    if (!payment || payment.provider !== "stripe" || payment.status !== "PENDING") return;
    if ((payment.providerReference && payment.providerReference !== session.id) ||
      !payment.amount.times(100).equals(session.amount_total) ||
      payment.currency.toLowerCase() !== session.currency) {
      throw new ApiError(409, "Checkout details do not match this payment");
    }
    const result = await tx.payment.updateMany({
      where: { id, status: "PENDING" },
      data: { status, providerReference: session.id, paidAt: status === "COMPLETED" ? new Date() : null },
    });
    if (result.count && status === "COMPLETED") {
      await tx.notification.create({ data: {
        userId: payment.booking.userId, bookingId: payment.bookingId, message: "Your reservation payment was confirmed.",
      } });
    }
  }, transactionOptions);
}

function verify(body: Buffer, header: string, secret: string) {
  const parts = header.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(timestamp + ".").update(body).digest();
  return parts.some((part) => /^v1=[0-9a-f]{64}$/i.test(part) &&
    timingSafeEqual(expected, Buffer.from(part.slice(3), "hex")));
}

export const stripeWebhook = Router();
stripeWebhook.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, "Checkout is not configured");
  if (!Buffer.isBuffer(req.body) || !verify(req.body, req.get("stripe-signature") ?? "", secret)) {
    throw new ApiError(400, "Invalid Stripe signature");
  }
  const event = JSON.parse(req.body.toString("utf8")) as { type: string; data: { object: Checkout } };
  const session = event.data.object;
  if (session?.client_reference_id) {
    if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
      await settle(session, "COMPLETED");
    } else if (event.type === "checkout.session.expired") {
      await settle(session, "FAILED");
    }
  }
  res.sendStatus(204);
});
