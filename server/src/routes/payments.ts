import { randomUUID } from "node:crypto";
import express, { Router } from "express";
import prisma from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, object, send, uuid } from "../api.js";
import {
  checkoutUrl,
  initializePaystack,
  paymentCallback,
  paymentReference,
  paystackKey,
  validPaystackSignature,
  verifyPaystack,
} from "../services/paystack.js";
import type { PaystackTransaction } from "../services/paystack.js";
import { transactionOptions } from "./bookings.js";

/** Match the verified amount, currency, and reference before changing a payment. */
async function settle(transaction: PaystackTransaction) {
  const reference = paymentReference(transaction.reference);
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        provider_providerReference: {
          provider: "paystack",
          providerReference: reference,
        },
      },
      include: { booking: true },
    });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (
      !Number.isSafeInteger(transaction.amount) ||
      !payment.amount.times(100).equals(transaction.amount) ||
      payment.currency !== transaction.currency
    ) {
      throw new ApiError(
        409,
        "Paystack transaction does not match this reservation",
      );
    }
    if (transaction.status === "success" && payment.status !== "COMPLETED") {
      const result = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "COMPLETED" } },
        data: { status: "COMPLETED", paidAt: new Date() },
      });
      if (result.count)
        await tx.notification.create({
          data: {
            userId: payment.booking.userId,
            bookingId: payment.bookingId,
            message:
              payment.booking.status === "CANCELLED"
                ? "Payment received for a cancelled reservation. Contact the hotel for assistance."
                : "Your reservation payment was confirmed.",
          },
        });
    } else if (
      transaction.status === "failed" &&
      payment.status === "PENDING"
    ) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }
    // Abandoned means unfinished, so preserve the same resumable checkout. Reversals require reconciliation.
    const updated = await tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    return {
      paymentId: updated.id,
      bookingId: updated.bookingId,
      status: updated.status,
    };
  }, transactionOptions);
}

export const payments = Router();
payments.post("/bookings/:id/checkout", requireAuth, async (req, res) => {
  paystackKey();
  const callback = paymentCallback();
  const bookingId = uuid(req.params.id);
  // Serializable reads prevent concurrent requests from creating separate pending attempts.
  const payment = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId, userId: req.user!.id },
      include: { payments: { where: { status: { not: "FAILED" } } } },
    });
    if (
      booking.status === "CANCELLED" ||
      booking.checkOutDate.getTime() <= Date.now()
    ) {
      throw new ApiError(
        409,
        "Checkout requires an active reservation with a future checkout date",
      );
    }
    if (booking.payments.some((item) => item.status === "COMPLETED"))
      throw new ApiError(409, "Reservation is already paid");
    const pending = booking.payments[0];
    if (pending) {
      if (pending.provider !== "paystack")
        throw new ApiError(
          409,
          "An earlier payment requires reconciliation before Paystack checkout can start. Contact the hotel.",
        );
      return pending;
    }
    const id = randomUUID();
    return tx.payment.create({
      data: {
        id,
        bookingId,
        amount: booking.totalPrice,
        provider: "paystack",
        providerReference: "hotel-" + id,
      },
    });
  }, transactionOptions);
  const reference = paymentReference(payment.providerReference);
  const bookingUrl = new URL("/bookings/" + bookingId, callback).href;
  if (payment.checkoutUrl) {
    const transaction = await verifyPaystack(reference);
    if (transaction.reference !== reference)
      throw new ApiError(
        409,
        "Paystack returned a different transaction reference",
      );
    const result = await settle(transaction);
    if (result.status === "COMPLETED")
      return send(res, { url: bookingUrl, paymentId: payment.id });
    if (transaction.status === "failed")
      throw new ApiError(
        409,
        "This payment attempt failed. Retry secure payment for a new attempt.",
      );
    if (!["abandoned", "pending"].includes(transaction.status))
      throw new ApiError(
        409,
        "Payment is being processed or requires review. Check payment status before retrying.",
      );
    return send(res, {
      url: checkoutUrl(payment.checkoutUrl),
      paymentId: payment.id,
    });
  }
  try {
    const initialized = await initializePaystack({
      email: req.user!.email,
      amount: payment.amount.times(100).toFixed(0),
      currency: payment.currency,
      reference,
      callback_url: callback,
    });
    if (initialized.reference !== reference)
      throw new ApiError(
        502,
        "Paystack returned a different transaction reference",
      );
    const url = checkoutUrl(initialized.authorization_url);
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING", checkoutUrl: null },
      data: { checkoutUrl: url },
    });
    send(res, { url, paymentId: payment.id });
  } catch (error) {
    // Initialization may succeed before a timeout. Keep the reference to avoid a second charge.
    const saved = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    if (saved.checkoutUrl)
      return send(res, {
        url: checkoutUrl(saved.checkoutUrl),
        paymentId: payment.id,
      });
    try {
      const transaction = await verifyPaystack(reference);
      if (transaction.reference === reference) {
        const result = await settle(transaction);
        if (result.status === "COMPLETED")
          return send(res, { url: bookingUrl, paymentId: payment.id });
      }
    } catch {
      /* Preserve the attempt for a safe retry or provider reconciliation. */
    }
    throw error;
  }
});

/** Return parameters identify an attempt; only server verification determines its result. */
payments.post("/payments/paystack/verify", requireAuth, async (req, res) => {
  const reference = paymentReference(object(req.body).reference);
  await prisma.payment.findFirstOrThrow({
    where: {
      provider: "paystack",
      providerReference: reference,
      booking: { userId: req.user!.id },
    },
  });
  const transaction = await verifyPaystack(reference);
  if (transaction.reference !== reference)
    throw new ApiError(
      409,
      "Paystack returned a different transaction reference",
    );
  send(res, await settle(transaction));
});

export const paystackWebhook = Router();
paystackWebhook.post(
  "/",
  express.raw({ type: "application/json", limit: "256kb" }),
  async (req, res) => {
    if (
      !Buffer.isBuffer(req.body) ||
      !validPaystackSignature(
        req.body,
        req.get("paystack-signature"),
        req.get("x-paystack-signature"),
      )
    )
      throw new ApiError(401, "Invalid Paystack signature");
    let event: { event?: string; data?: PaystackTransaction };
    try {
      event = JSON.parse(req.body.toString("utf8")) as typeof event;
    } catch {
      throw new ApiError(400, "Invalid webhook JSON");
    }
    if (event?.event === "charge.success" && event.data?.status === "success") {
      const reference = event.data.reference;
      if (typeof reference !== "string" || reference.length > 100)
        return void res.sendStatus(200);
      // A shared merchant account can send transactions belonging to other applications.
      const payment = await prisma.payment.findUnique({
        where: {
          provider_providerReference: {
            provider: "paystack",
            providerReference: reference,
          },
        },
      });
      if (payment) await settle(event.data);
    }
    // Acknowledge after durable settlement so database failures are retried by Paystack.
    res.sendStatus(200);
  },
);
