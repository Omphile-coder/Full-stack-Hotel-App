import { Router } from "express";
import prisma from "../config/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  ApiError,
  bool,
  integer,
  object,
  page,
  send,
  string,
  uuid,
} from "../api.js";
import { bookingDetails } from "./bookings.js";

function accommodationInput(value: unknown, partial: boolean) {
  const body = object(value);
  const textFields = {
    name: 200,
    city: 100,
    description: 5000,
    address: 300,
    policies: 5000,
  } as const;
  const required = Object.fromEntries(
    Object.entries(textFields)
      .filter(([key]) => !partial || key in body)
      .map(([key, max]) => [key, string(body[key], key, max)]),
  ) as Record<keyof typeof textFields, string>;
  const coordinate = (key: string, max: number) => {
    const value = body[key];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      Math.abs(value) > max
    ) {
      throw new ApiError(400, "Invalid " + key);
    }
    return value;
  };
  const facilities = () => {
    if (!Array.isArray(body.facilities) || body.facilities.length > 100) {
      throw new ApiError(
        400,
        "facilities must be an array of up to 100 entries",
      );
    }
    return body.facilities.map((item) => string(item, "facility"));
  };
  const optional = (key: string) =>
    body[key] === null ? null : string(body[key], key);
  return {
    ...required,
    ...(!partial || "latitude" in body
      ? { latitude: coordinate("latitude", 90) }
      : {}),
    ...(!partial || "longitude" in body
      ? { longitude: coordinate("longitude", 180) }
      : {}),
    ...(!partial || "starRating" in body
      ? { starRating: integer(body.starRating, "starRating", 1, 5) }
      : {}),
    ...(!partial || "facilities" in body ? { facilities: facilities() } : {}),
    ...("isPublished" in body
      ? { isPublished: bool(body.isPublished, "isPublished") }
      : {}),
    ...("tagline" in body ? { tagline: optional("tagline") } : {}),
    ...("phoneNumber" in body ? { phoneNumber: optional("phoneNumber") } : {}),
    ...("email" in body ? { email: optional("email") } : {}),
  };
}

function images(value: unknown) {
  if (!Array.isArray(value) || value.length > 30) {
    throw new ApiError(400, "images must be an array of up to 30 entries");
  }
  return value.map((entry, sortOrder) => {
    const image = object(entry);
    const imageUrl = string(image.imageUrl, "imageUrl", 2048);
    if (!/^https?:\/\/[^\s/]+|^\/(?!\/)[^\s\\]+$/i.test(imageUrl)) {
      throw new ApiError(
        400,
        "imageUrl must be an HTTP(S) URL or a local path",
      );
    }
    return {
      imageUrl,
      sortOrder,
      altText: image.altText == null ? null : string(image.altText, "altText"),
    };
  });
}

export const inventory = Router();
// Dashboard totals are calculated across the database rather than a paginated UI list.
inventory.get("/admin/summary", requireAdmin, async (_req, res) => {
  const [
    hotels,
    publishedHotels,
    activeRooms,
    reservations,
    completedPayments,
    recentBookings,
    unpaidReservations,
  ] = await prisma.$transaction(
    [
      prisma.accommodation.count(),
      prisma.accommodation.count({ where: { isPublished: true } }),
      prisma.room.count({ where: { isActive: true } }),
      prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED", currency: "ZAR" },
        _sum: { amount: true },
      }),
      prisma.booking.findMany({
        take: 5,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          ...bookingDetails,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.booking.count({
        where: {
          status: { not: "CANCELLED" },
          payments: { none: { status: "COMPLETED" } },
        },
      }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  send(res, {
    hotels,
    publishedHotels,
    activeRooms,
    reservations: reservations.reduce((sum, item) => sum + item._count._all, 0),
    pendingReservations: unpaidReservations,
    receivedPayments: completedPayments._sum.amount?.toFixed(2) ?? "0.00",
    recentBookings,
  });
});
inventory.get("/admin/accommodations", requireAdmin, async (req, res) => {
  send(
    res,
    await prisma.accommodation.findMany({
      ...page(req.query),
      orderBy: { id: "asc" },
    }),
  );
});
inventory.get("/admin/accommodations/:id", requireAdmin, async (req, res) => {
  send(
    res,
    await prisma.accommodation.findUniqueOrThrow({
      where: { id: uuid(req.params.id) },
      include: { rooms: true, images: { orderBy: { sortOrder: "asc" } } },
    }),
  );
});
inventory.post("/accommodations", requireAdmin, async (req, res) => {
  const body = object(req.body);
  const fields = accommodationInput(body, false);
  const data = {
    ...fields,
    latitude: fields.latitude!,
    longitude: fields.longitude!,
    starRating: fields.starRating!,
    ...("images" in body ? { images: { create: images(body.images) } } : {}),
  };
  send(
    res,
    await prisma.accommodation.create({ data, include: { images: true } }),
    201,
  );
});
inventory.patch("/accommodations/:id", requireAdmin, async (req, res) => {
  const body = object(req.body);
  const data = {
    ...accommodationInput(body, true),
    ...("images" in body
      ? { images: { deleteMany: {}, create: images(body.images) } }
      : {}),
  };
  send(
    res,
    await prisma.accommodation.update({
      where: { id: uuid(req.params.id) },
      data,
      include: { images: true },
    }),
  );
});
inventory.delete("/accommodations/:id", requireAdmin, async (req, res) => {
  // Keep reservation and review history accessible to staff.
  await prisma.accommodation.update({
    where: { id: uuid(req.params.id) },
    data: { isPublished: false },
  });
  res.sendStatus(204);
});
inventory.patch(
  "/accommodations/:id/rooms/:roomId",
  requireAdmin,
  async (req, res) => {
    const body = object(req.body);
    const price =
      "pricePerNight" in body
        ? string(body.pricePerNight, "pricePerNight")
        : undefined;
    if (
      price !== undefined &&
      (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(price) || Number(price) <= 0)
    ) {
      throw new ApiError(400, "Invalid pricePerNight");
    }
    const data = {
      ...("roomNumber" in body
        ? { roomNumber: string(body.roomNumber, "roomNumber", 50) }
        : {}),
      ...("roomType" in body
        ? { roomType: string(body.roomType, "roomType", 100) }
        : {}),
      ...("description" in body
        ? {
            description:
              body.description === null
                ? null
                : string(body.description, "description", 2000),
          }
        : {}),
      ...("capacity" in body
        ? { capacity: integer(body.capacity, "capacity", 1, 2147483647) }
        : {}),
      ...("isActive" in body
        ? { isActive: bool(body.isActive, "isActive") }
        : {}),
      pricePerNight: price,
    };
    send(
      res,
      await prisma.room.update({
        where: {
          id: uuid(req.params.roomId),
          accommodationId: uuid(req.params.id),
        },
        data,
      }),
    );
  },
);
inventory.delete(
  "/accommodations/:id/rooms/:roomId",
  requireAdmin,
  async (req, res) => {
    await prisma.room.update({
      where: {
        id: uuid(req.params.roomId),
        accommodationId: uuid(req.params.id),
      },
      data: { isActive: false },
    });
    res.sendStatus(204);
  },
);
