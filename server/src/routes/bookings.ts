import { Router } from "express";
import prisma from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { ApiError, integer, object, page, send, uuid } from "../api.js";

export const bookingDetails = {
  bookingRooms: { include: { room: { include: { accommodation: { select: { id: true, name: true } } } } } },
  payments: { select: { id: true, amount: true, currency: true, status: true, paidAt: true, provider: true, providerReference: true } },
} satisfies Prisma.BookingInclude;

export const transactionOptions = { isolationLevel: "Serializable" } as const;
const dayMs = 86400000;

function date(value: unknown, field: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(value + "T00:00:00Z");
    if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) return parsed;
  }
  throw new ApiError(400, field + " must be a valid YYYY-MM-DD date");
}

function stay(body: Record<string, unknown>) {
  const checkInDate = date(body.checkInDate, "checkInDate");
  const checkOutDate = date(body.checkOutDate, "checkOutDate");
  const nights = (checkOutDate.getTime() - checkInDate.getTime()) / dayMs;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  if (checkInDate.toISOString().slice(0, 10) < today || nights < 1 || nights > 365) {
    throw new ApiError(400, "Choose a future or current stay of 1 to 365 nights");
  }
  return { checkInDate, checkOutDate, nights };
}

function openRooms(checkInDate: Date, checkOutDate: Date, bookingId?: string): Prisma.RoomWhereInput {
  return {
    isActive: true,
    accommodation: { isPublished: true },
    bookingRooms: { none: { booking: {
      id: bookingId ? { not: bookingId } : undefined,
      status: { not: "CANCELLED" },
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
    } } },
  };
}

async function reservation(tx: Prisma.TransactionClient, value: unknown, bookingId?: string) {
  const body = object(value);
  const { checkInDate, checkOutDate, nights } = stay(body);
  const numberOfGuests = integer(body.numberOfGuests, "numberOfGuests", 1, 1000);
  if (!Array.isArray(body.roomIds) || body.roomIds.length < 1 || body.roomIds.length > 20) {
    throw new ApiError(400, "Select between 1 and 20 rooms");
  }
  const roomIds = body.roomIds.map(uuid);
  if (new Set(roomIds).size !== roomIds.length) throw new ApiError(400, "Room IDs must be unique");
  const rooms = await tx.room.findMany({ where: {
    id: { in: roomIds }, ...openRooms(checkInDate, checkOutDate, bookingId),
  } });
  if (rooms.length !== roomIds.length) throw new ApiError(409, "One or more rooms are unavailable");
  if (new Set(rooms.map((room) => room.accommodationId)).size !== 1) {
    throw new ApiError(400, "Select rooms from one accommodation");
  }
  if (rooms.reduce((sum, room) => sum + room.capacity, 0) < numberOfGuests) {
    throw new ApiError(400, "Selected rooms do not have enough capacity");
  }
  const totalPrice = rooms.reduce((total, room) => total.plus(room.pricePerNight), new Prisma.Decimal(0)).times(nights);
  if (totalPrice.greaterThan("99999999.99")) throw new ApiError(400, "Reservation total exceeds the limit");
  return {
    fields: { checkInDate, checkOutDate, numberOfGuests, totalPrice },
    rooms: rooms.map(({ id, pricePerNight }) => ({ roomId: id, pricePerNight })),
  };
}

export const bookings = Router();
bookings.get("/accommodations/:id/availability", async (req, res) => {
  const { checkInDate, checkOutDate } = stay(req.query);
  const accommodationId = uuid(req.params.id);
  await prisma.accommodation.findUniqueOrThrow({ where: { id: accommodationId, isPublished: true } });
  send(res, await prisma.room.findMany({
    where: { accommodationId, ...openRooms(checkInDate, checkOutDate) },
    ...page(req.query), orderBy: [{ pricePerNight: "asc" }, { id: "asc" }],
  }));
});
bookings.post("/bookings", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const booking = await prisma.$transaction(async (tx) => {
    const { fields, rooms } = await reservation(tx, req.body);
    const created = await tx.booking.create({
      // Rooms are reserved immediately; verified payment completes confirmation.
      data: { ...fields, userId, status: "APPROVED", bookingRooms: { create: rooms } }, include: bookingDetails,
    });
    await tx.notification.create({
      data: { userId, bookingId: created.id, message: "Your rooms are reserved. Complete secure payment to confirm your stay." },
    });
    return created;
  }, transactionOptions);
  send(res, booking, 201);
});
bookings.get("/bookings", requireAuth, async (req, res) => {
  send(res, await prisma.booking.findMany({
    where: { userId: req.user!.id }, include: bookingDetails, ...page(req.query),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  }));
});
bookings.get("/bookings/:id", requireAuth, async (req, res) => {
  send(res, await prisma.booking.findUniqueOrThrow({
    where: { id: uuid(req.params.id), userId: req.user!.id }, include: bookingDetails,
  }));
});
const adminDetails = {
  ...bookingDetails,
  user: { select: { id: true, name: true, email: true, phoneNumber: true } },
} satisfies Prisma.BookingInclude;
bookings.get("/admin/bookings", requireAdmin, async (req, res) => {
  send(res, await prisma.booking.findMany({
    ...page(req.query), include: adminDetails, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  }));
});
bookings.get("/admin/bookings/:id", requireAdmin, async (req, res) => {
  send(res, await prisma.booking.findUniqueOrThrow({ where: { id: uuid(req.params.id) }, include: adminDetails }));
});
bookings.patch("/admin/bookings/:id", requireAdmin, async (req, res) => {
  const id = uuid(req.params.id);
  const body = object(req.body);
  const status = body.status;
  if (status !== "APPROVED" && status !== "MODIFIED" && status !== "CANCELLED") {
    throw new ApiError(400, "status must be APPROVED, MODIFIED or CANCELLED");
  }
  const booking = await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUniqueOrThrow({ where: { id }, include: adminDetails });
    if (status === current.status && status !== "MODIFIED") return current;
    if (current.status === "CANCELLED") throw new ApiError(409, "Reservation has been cancelled");
    if (status !== "APPROVED" && current.payments.some((payment) => payment.status !== "FAILED")) {
      throw new ApiError(409, "Resolve the active or completed payment before changing this reservation");
    }
    let data: Prisma.BookingUpdateInput = { status };
    if (status === "MODIFIED") {
      const { fields, rooms } = await reservation(tx, body, id);
      await tx.bookingRoom.deleteMany({ where: { bookingId: id } });
      data = { ...data, ...fields, bookingRooms: { create: rooms } };
    }
    const updated = await tx.booking.update({ where: { id }, data, include: adminDetails });
    await tx.notification.create({
      data: { userId: current.userId, bookingId: id, message: "Your reservation was " + status.toLowerCase() + "." },
    });
    return updated;
  }, transactionOptions);
  send(res, booking);
});
