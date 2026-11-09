# Hotel API

The API uses the existing Google OAuth and PostgreSQL sessions. Use a Neon development branch and copy the values from your existing server environment into the matching variables in `.env.example`. Keep the pooled Neon connection in `DATABASE_URL` and the direct connection in `DATABASE_URL_UNPOOLED`.

From the server directory, run `npm ci`, `npx prisma migrate deploy`, `npx prisma generate`, then `npm run dev`. Sign in at `/api/v1/auth/google`. Use an existing account with the `ADMIN` role for admin operations. In the frontend, include credentials on requests to the configured API origin.

All paths below start with `/api/v1`. Lists added in this change return up to 20 records and accept `offset`.

| Access | Endpoint | Purpose |
| --- | --- | --- |
| Public | GET /accommodations | Browse and filter by location, minPrice, maxPrice, minStars, and minCapacity |
| Public | GET /accommodations/:id | Hotel details, gallery, coordinates, facilities, policies, and room prices |
| Public | GET /accommodations/:id/availability | Find available rooms for checkInDate and checkOutDate |
| Public | GET /accommodations/:id/reviews | List reviews and get average rating and review count |
| Public | POST /auth/register | Create a guest account with name, email, and password and start a session |
| Public | POST /auth/login | Start a session with email and password |
| Public | POST /auth/forgot-password | Request a recovery email with an email address |
| Public | POST /auth/reset-password | Replace a password using a one-time token and new password |
| Signed in | GET, PATCH /me | View profile and edit name and phoneNumber |
| Signed in | GET /favorites, PUT or DELETE /favorites/:id | View, save, or remove a favourite hotel |
| Signed in | PUT or DELETE /accommodations/:id/reviews/me | Save or remove your rating (1–5) and optional comment |
| Signed in | GET, POST /bookings and GET /bookings/:id | Create and view your reservations |
| Signed in | POST /bookings/:id/checkout | Get a Paystack Checkout URL for your active unpaid booking |
| Signed in | POST /payments/paystack/verify | Verify the supplied reference against Paystack and return bookingId, paymentId, and status; ownership is enforced |
| Provider | POST /payments/paystack/webhook | Process signed charge.success events without a browser session |
| Signed in | GET /notifications and PATCH /notifications/:id | Read the in-app feed and mark a personal notification read with {"read":true} |
| Admin | GET /admin/accommodations and GET /admin/accommodations/:id | View inventory, including unpublished hotels and inactive rooms |
| Admin | POST /accommodations and PATCH or DELETE /accommodations/:id | Create, edit, or unpublish a hotel |
| Admin | POST /accommodations/:id/rooms and PATCH or DELETE /accommodations/:id/rooms/:roomId | Create, edit, or deactivate a room |
| Admin | GET /admin/bookings and GET or PATCH /admin/bookings/:id | View guest and reservation details and manage reservations |
| Admin | POST /admin/promotions | Publish a message to the in-app notification feed |

Creating a hotel requires name, city, description, address, latitude, longitude, starRating, facilities, and policies. Send images as an optional ordered array of objects with imageUrl and optional altText. Sending images in a PATCH replaces the gallery. Set isPublished to true to make it public.

Create a reservation with checkInDate and checkOutDate in YYYY-MM-DD format, numberOfGuests, and roomIds. The server calculates the total from the room rates and checks for overlapping reservations. The checkout day is available for a new check-in. New reservations are created with internal status APPROVED so checkout is available immediately. This means rooms are reserved; payment is confirmed separately by a verified webhook. Existing PENDING and MODIFIED reservations can also proceed directly to checkout. There is no staff approval step. Admin updates retain APPROVED for backward compatibility, plus MODIFIED and CANCELLED. For MODIFIED, also supply the full stay and room selection. All active unpaid reservations hold the rooms. The dashboard pendingReservations field counts active bookings without a completed payment. Resolve active payments before modifying or cancelling reservations. A completed payment needs a refund workflow before the booking can be changed.

## Email and password sign-in

Apply the password auth migration with npx prisma migrate deploy and regenerate the Prisma client with npx prisma generate. Google accounts keep their existing identity. Password registration normalizes email and rejects addresses already in use. Guests created by registration always start with the USER role. Both methods use the same PostgreSQL sessions and role redirects.

New and reset passwords must have 16 to 128 characters. Existing passwords can still be used to sign in. Passwords are stored as salted scrypt hashes. Authentication and recovery endpoints limit attempts per client IP in each server process. For deployments behind a reverse proxy, configure Express to trust only the known proxy so the limits use each client's IP.

To enable recovery email delivery, set RESEND_API_KEY and AUTH_EMAIL_FROM in server/.env. Use a sender on your verified Resend domain, then restart the API. Keep CLIENT_URL pointed at the frontend where the email link should open. The recovery link expires after 30 minutes, works once, and revokes old password sessions. Use HTTPS for a deployed frontend. Google-only accounts continue to recover access through Google.

## Paystack setup

Run npx prisma migrate deploy and npx prisma generate after updating the code. The additive migration adds a nullable checkoutUrl column; existing payments are preserved.

Keep PAYSTACK_SECRET_KEY in server/.env. Start with an sk_test_ key from the South African Paystack account. Set PAYSTACK_CALLBACK_URL=http://localhost:5173/payments/callback locally and use your deployed frontend URL in production. The callback must share CLIENT_URL's origin. Initialization sends the signed-in account's email, the stored reservation amount in cents, and ZAR currency to Paystack. The browser cannot override the total or mark a booking paid.

Add https://YOUR-PUBLIC-API/api/v1/payments/paystack/webhook as the webhook URL in the matching Paystack test/live settings. Paystack cannot reach localhost, so local webhook delivery needs a public HTTPS tunnel or a deployed API. Server verification on the return page still works locally without a webhook tunnel.

When using the current Paystack-Signature header, set PAYSTACK_WEBHOOK_SECRET to that mode's whsec_ signing secret. The server verifies timestamped HMAC SHA512 signatures with a five-minute tolerance. If your account still uses x-paystack-signature, leave PAYSTACK_WEBHOOK_SECRET blank and the server verifies the raw-body HMAC SHA512 with PAYSTACK_SECRET_KEY. Once a signing secret is configured, legacy signatures cannot bypass it. Webhooks are mounted before JSON parsing, return 200 after settlement, and handle repeated events without duplicate confirmations.

The frontend return page reads reference (or trxref), calls the authenticated verification endpoint, and opens the reservation only after server-confirmed success. Refresh status on a reservation can also verify a pending Paystack payment if a callback or webhook was delayed. Incomplete or abandoned checkout stays unpaid and reuses its saved URL. Verified failures allow a new payment attempt on the same booking. An ambiguous initialization timeout preserves the existing reference instead of blindly starting another payment; a lost link may require provider reconciliation. Success arriving after a failure is still recorded. Amount, currency, and reference must match storage before settlement.

Historical completed Stripe payments remain valid records. Unresolved earlier-provider attempts block new Paystack checkout until reconciled so migration cannot create a second charge. The retired Stripe webhook route is removed; resolve any outstanding old checkout sessions before switching a live deployment. Refund and chargeback operations remain outside this implementation.

Run npm run test:payments for payment service regression tests using fixture keys and fake HTTP responses. No account, network, or database is required for that command. The migration was also checked with disposable PostgreSQL integration tests and a real test-key initialization/verification smoke test, without charging a card.

Official references: https://paystack.com/docs/api/transaction/ and https://paystack.com/docs/payments/webhooks/.
