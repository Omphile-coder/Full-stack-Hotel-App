-- Retain the hosted Paystack URL so checkout retries reuse the same transaction.
ALTER TABLE "payments" ADD COLUMN "checkoutUrl" TEXT;
