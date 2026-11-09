# Black Clover Hotels

A full-stack hotel booking and management application for Black Clover’s South African properties.

Guests can explore hotel branches, check room availability, book a stay, and pay through Paystack. Hotel staff use a separate admin dashboard to manage properties, room inventory, reservations, and promotions. The React frontend lives in `client/`, and the Express API in `server/` connects to Neon PostgreSQL through Prisma.

**Live application:** [https://full-stack-hotel-app-nine.vercel.app](https://full-stack-hotel-app-nine.vercel.app)\
**API health check:** [https://black-clover-api.onrender.com/api/v1/health](https://black-clover-api.onrender.com/api/v1/health)

## Preview

![Black Clover Hotels website preview](client/public/images/preview_image.png)

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Redux Toolkit and RTK Query, CSS, Lucide React, React Icons |
| Backend | Node.js, Express, TypeScript, Passport, express-session |
| Database | Neon PostgreSQL, Prisma ORM, PostgreSQL session storage |
| Authentication | Email and password, Google OAuth, Resend for password recovery |
| Payments | Paystack hosted checkout in South African rand (ZAR) |

## Features

### Guest experience

- Browse hotel branches, room prices, galleries, maps, facilities, and policies.
- Search by location, travel dates, guest count, room count, price range, and rating. The booking draft carries search choices into checkout.
- Register or sign in, edit your name and phone number, save favourites, share hotel pages, manage your own reviews, and read notifications.
- Reserve available rooms, pay through Paystack, and track the reservation in My Bookings.

### Administration

- View hotel and room totals, unpaid reservations, and recent booking activity.
- Manage accommodation listings, room inventory, and nightly prices.
- Review guest reservations and modify or cancel eligible stays.
- Publish promotions to the in-app notification feed.

## Run locally

Use Node.js 22.12 or later in the 22.x series, or Node.js 24 or newer, with npm. You’ll need a Neon database, a Google OAuth web client, and a session secret. Add a Paystack test key to try checkout and Resend settings to try password recovery emails.

### 1. Install dependencies

Run these commands from the project root.

```powershell
npm ci --prefix server
npm ci --prefix client
```

### 2. Configure the backend

Create `server/.env` from [the backend environment template](server/.env.example) and fill in your own values. Keep real credentials in `server/.env` or your deployment environment.

```dotenv
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://USER:PASSWORD@POOLED_HOST:5432/DATABASE?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE?sslmode=require
SESSION_SECRET=replace-with-a-long-random-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

PAYSTACK_SECRET_KEY=
PAYSTACK_CALLBACK_URL=http://localhost:5173/payments/callback
PAYSTACK_WEBHOOK_SECRET=

RESEND_API_KEY=
AUTH_EMAIL_FROM=
```

- Use Neon’s pooled connection string for `DATABASE_URL` and its direct connection string for `DATABASE_URL_UNPOOLED`. Prisma CLI uses the direct connection for migrations and seeding.
- In Google Cloud, add the exact value of `GOOGLE_CALLBACK_URL` to the web client’s authorised redirect URIs.
- Set `PAYSTACK_SECRET_KEY` to your test secret key to enable checkout. Configure `PAYSTACK_WEBHOOK_SECRET` when using Paystack’s timestamped webhook signatures. See the [backend guide](server/BACKEND.md#paystack-setup) for the supported signature formats.
- Set `RESEND_API_KEY` and `AUTH_EMAIL_FROM` to enable password recovery emails. Use a sender authorised by your Resend account. Reset links open on `CLIENT_URL`.

### 3. Configure the frontend

Local development uses `VITE_API_URL=/api/v1` by default. Vite proxies `/api` to `http://localhost:3000` and forwards the session cookie. If you need to override the API base, copy [the frontend environment template](client/.env.example) to `client/.env` and edit `VITE_API_URL`.

### 4. Prepare PostgreSQL

From the project root:

```powershell
cd server
npx prisma migrate deploy
npx prisma generate
cd ..
```

For sample hotels and rooms, run `npx prisma db seed` from `server/` against your development database.

### 5. Start the API and frontend

Run each command in a separate terminal from the project root.

```powershell
npm run dev --prefix server
npm run dev --prefix client
```

| Service | Local URL |
| --- | --- |
| Guest website | http://localhost:5173 |
| Sign in and register | http://localhost:5173/signin |
| Guest profile | http://localhost:5173/profile |
| Admin dashboard | http://localhost:5173/admin |
| API health check | http://localhost:3000/api/v1/health |
| Database health check | http://localhost:3000/api/v1/health/database |

## Authentication and account security

Guests and admins share one sign-in page for email and password or Google OAuth. Both methods use the `blackclover.sid` HTTP-only cookie and a server session stored in PostgreSQL. Email registration assigns the `USER` role. The backend checks for the `ADMIN` role before allowing access to admin operations.

Local passwords are stored as salted scrypt hashes. A password reset link works once and expires after 30 minutes. Signing out ends the server session. See the [backend authentication notes](server/BACKEND.md#email-and-password-sign-in) for more detail.

## Booking and payments

1. Choose a hotel, travel dates, and available rooms. The server checks availability and calculates the total from stored room rates.
2. Submit the reservation to proceed to Paystack Checkout. An active reservation holds the selected rooms while payment is pending.
3. Paystack returns the guest to `/payments/callback`. The backend verifies the payment reference, amount, and currency before confirming payment. A signed Paystack webhook can also confirm payment.
4. If checkout is interrupted, reopen the same eligible reservation to resume payment. Paid reservations require a refund before they can be modified or cancelled. Refund processing is outside the current application.

Configure the webhook with your public HTTPS API URL followed by `/api/v1/payments/paystack/webhook`. Local checkout return verification works without a public webhook, while testing webhook delivery locally requires a public HTTPS tunnel.

## API overview

These paths are relative to `/api/v1`. The browser sends the session cookie with authenticated requests.

| Access | Method and route | Purpose |
| --- | --- | --- |
| Public | `GET /health`, `GET /health/database` | Check the API and database connection |
| Public | `POST /auth/register`, `POST /auth/login` | Create a guest account or sign in |
| Public | `GET /auth/google`, `GET /auth/google/callback` | Start and complete Google OAuth |
| Public | `POST /auth/forgot-password`, `POST /auth/reset-password` | Request and use a password reset link |
| Public | `GET /accommodations`, `GET /accommodations/:id` | Browse accommodation and hotel details |
| Public | `GET /accommodations/:id/availability`, `GET /accommodations/:id/reviews` | Check room availability and read reviews |
| Signed in | `GET /auth/me`, `POST /auth/logout` | Check or end the current session |
| Signed in | `GET /me`, `PATCH /me` | View or edit the current profile |
| Signed in | `GET /favorites`, `PUT /favorites/:id`, `DELETE /favorites/:id` | Manage favourite hotels |
| Signed in | `PUT /accommodations/:id/reviews/me`, `DELETE /accommodations/:id/reviews/me` | Save or remove your own review |
| Signed in | `GET /notifications`, `PATCH /notifications/:id` | Read notifications and mark them as read |
| Signed in | `POST /bookings`, `GET /bookings`, `GET /bookings/:id` | Create, list, or view your reservations |
| Signed in | `POST /bookings/:id/checkout`, `POST /payments/paystack/verify` | Open checkout and verify payment |
| Paystack | `POST /payments/paystack/webhook` | Receive signed payment events |
| Admin | `GET /admin/summary`, `GET /admin/accommodations`, `GET /admin/bookings` | View dashboard totals, inventory, and reservations |
| Admin | `PATCH /admin/bookings/:id`, `POST /admin/promotions` | Update a reservation or publish a promotion |

See the [backend API guide](server/BACKEND.md) for the remaining inventory routes, request fields, and booking rules.

## Project structure

```text
Full-stack-Hotel-App/
├── client/
│   ├── public/images/figma/    Hotel photography
│   └── src/
│       ├── components/        Guest, admin, and shared UI
│       ├── context/           Session and shared feedback
│       ├── hooks/             Session and sign-out hooks
│       ├── lib/               API endpoints, types, and booking draft
│       ├── pages/             Guest, admin, authentication, and payment screens
│       ├── App.tsx            Routes and layouts
│       ├── index.css          Design tokens and responsive styles
│       └── store.ts           Redux store
├── server/
│   ├── prisma/                Schema, migrations, and development seed
│   ├── src/
│   │   ├── config/            Prisma, Passport, and session configuration
│   │   ├── controllers/       Accommodation and room handlers
│   │   ├── middleware/        Authentication and role checks
│   │   ├── routes/            Express API routes
│   │   ├── services/          Hotel, password, and payment logic
│   │   └── server.ts          API entry point
│   ├── tests/                 Paystack regression suite
│   └── BACKEND.md             API and provider setup
└── README.md
```

## Deployment

Build the frontend with `npm run build --prefix client` and serve `client/dist/`. Configure your host to serve `index.html` for frontend routes such as `/hotels/:id` and `/payments/callback`.

Use HTTPS, set `NODE_ENV=production`, and set `CLIENT_URL` to the public frontend origin. Route `/api` to Express on the same origin when possible so the app can use its `SameSite=Lax` session cookie. For a separate API origin, set the public API base in `VITE_API_URL` at build time and verify that the deployment supports the session cookie. If HTTPS terminates at a reverse proxy, configure Express to trust the known proxy so it can issue secure cookies.

Set the production database and provider credentials in the server environment. Register the deployed `GOOGLE_CALLBACK_URL` with Google, set `PAYSTACK_CALLBACK_URL` to the deployed frontend return route, and configure the matching Paystack webhook. Run Prisma migrations and generate the client from `server/`, then build and start the API with `npm run build` and `npm start`.

## Checks

From the project root, after generating the Prisma client:

```powershell
npm run lint --prefix client
npm run build --prefix client
npm test --prefix server
```

The backend test command builds the API and runs the Paystack regression suite with mock provider responses. To check the live integrations, exercise Google sign-in, a complete Paystack test payment, and signed webhook delivery in your test environment.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The API is unreachable | Start Express on port 3000, check `/api/v1/health`, and verify Vite’s API proxy or the deployed `VITE_API_URL`. |
| No hotels appear | Check `/api/v1/health/database`, run the migrations, and seed or publish at least one accommodation. |
| Google sign-in fails | Compare `GOOGLE_CALLBACK_URL` with the authorised redirect URI in Google Cloud and verify `CLIENT_URL`. |
| A signed-in request returns `401` | Check that the request sends `blackclover.sid`. Use `localhost` consistently during local development. |
| Admin access is denied | Confirm the signed-in account has the `ADMIN` role in the database. |
| Password reset email does not arrive | Verify `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, and that your Resend account can send to the recipient. |
| Payment stays pending | Check the reservation’s payment status, the server’s Paystack verification response, and webhook delivery. |


## Admin Logins:
Email: Admin@gmail.com
Passowrd: Admin23@gmail.com

