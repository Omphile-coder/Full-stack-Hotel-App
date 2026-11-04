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
| Signed in | GET, PATCH /me | View profile and edit name and phoneNumber |
| Signed in | GET /favorites, PUT or DELETE /favorites/:id | View, save, or remove a favourite hotel |
| Signed in | PUT or DELETE /accommodations/:id/reviews/me | Save or remove your rating (1–5) and optional comment |
| Signed in | GET, POST /bookings and GET /bookings/:id | Create and view your reservations |
| Signed in | POST /bookings/:id/checkout | Get a Stripe Checkout URL for your approved booking |
| Signed in | GET /notifications and PATCH /notifications/:id | Read the in-app feed and mark a personal notification read with {"read":true} |
| Admin | GET /admin/accommodations and GET /admin/accommodations/:id | View inventory, including unpublished hotels and inactive rooms |
| Admin | POST /accommodations and PATCH or DELETE /accommodations/:id | Create, edit, or unpublish a hotel |
| Admin | POST /accommodations/:id/rooms and PATCH or DELETE /accommodations/:id/rooms/:roomId | Create, edit, or deactivate a room |
| Admin | GET /admin/bookings and GET or PATCH /admin/bookings/:id | View guest and reservation details and manage reservations |
| Admin | POST /admin/promotions | Publish a message to the in-app notification feed |

Creating a hotel requires name, city, description, address, latitude, longitude, starRating, facilities, and policies. Send images as an optional ordered array of objects with imageUrl and optional altText. Sending images in a PATCH replaces the gallery. Set isPublished to true to make it public.

Create a reservation with checkInDate and checkOutDate in YYYY-MM-DD format, numberOfGuests, and roomIds. The server calculates the total from the room rates and checks for overlapping reservations. The checkout day is available for a new check-in. Admin updates use status APPROVED, MODIFIED, or CANCELLED. For MODIFIED, also supply the full stay and room selection. Pending reservations hold the rooms. Resolve active payments before modifying or cancelling reservations. A completed payment needs a refund workflow before the booking can be changed.

Configure Stripe in sandbox mode with STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Set the success and cancellation URLs to your booking page. Forward checkout.session.completed and checkout.session.expired to POST /api/v1/payments/stripe/webhook. The API sets the payment amount from the stored reservation in ZAR and verifies webhook signatures before recording payments. Use HTTPS for the deployed client, API, and webhook. Notifications are delivered through the API for the frontend to display.

