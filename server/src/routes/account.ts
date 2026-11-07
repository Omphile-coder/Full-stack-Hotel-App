import { Router } from "express";
import prisma from "../config/prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { ApiError, integer, object, page, send, string, uuid } from "../api.js";

export const account = Router();
const profile = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  profilePicture: true,
  role: true,
} as const;

account.get("/me", requireAuth, async (req, res) => {
  send(
    res,
    await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: profile,
    }),
  );
});
account.patch("/me", requireAuth, async (req, res) => {
  const body = object(req.body);
  const data = {
    ...("name" in body ? { name: string(body.name, "name", 100) } : {}),
    ...("phoneNumber" in body
      ? {
          phoneNumber:
            body.phoneNumber === null
              ? null
              : string(body.phoneNumber, "phoneNumber", 32),
        }
      : {}),
  };
  send(
    res,
    await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: profile,
    }),
  );
});
account.get("/favorites", requireAuth, async (req, res) => {
  send(
    res,
    await prisma.favorite.findMany({
      where: { userId: req.user!.id, accommodation: { isPublished: true } },
      include: {
        accommodation: {
          include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
        },
      },
      ...page(req.query),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  );
});
account.put("/favorites/:id", requireAuth, async (req, res) => {
  const accommodationId = uuid(req.params.id);
  const userId = req.user!.id;
  await prisma.accommodation.findUniqueOrThrow({
    where: { id: accommodationId, isPublished: true },
  });
  send(
    res,
    await prisma.favorite.upsert({
      where: { userId_accommodationId: { userId, accommodationId } },
      create: { userId, accommodationId },
      update: {},
    }),
  );
});
account.delete("/favorites/:id", requireAuth, async (req, res) => {
  await prisma.favorite.deleteMany({
    where: { userId: req.user!.id, accommodationId: uuid(req.params.id) },
  });
  res.sendStatus(204);
});

account.get("/accommodations/:id/reviews", async (req, res) => {
  const accommodationId = uuid(req.params.id);
  await prisma.accommodation.findUniqueOrThrow({
    where: { id: accommodationId, isPublished: true },
  });
  const where = { accommodationId };
  const [reviews, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { name: true, profilePicture: true } } },
      ...page(req.query),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
  ]);
  send(res, {
    reviews: reviews.map(({ userId, ...review }) => review),
    averageRating: summary._avg.rating,
    reviewCount: summary._count,
  });
});
account.put("/accommodations/:id/reviews/me", requireAuth, async (req, res) => {
  const accommodationId = uuid(req.params.id);
  const userId = req.user!.id;
  const body = object(req.body);
  const rating = integer(body.rating, "rating", 1, 5);
  const comment =
    body.comment == null ? null : string(body.comment, "comment", 2000);
  await prisma.accommodation.findUniqueOrThrow({
    where: { id: accommodationId, isPublished: true },
  });
  send(
    res,
    await prisma.review.upsert({
      where: { userId_accommodationId: { userId, accommodationId } },
      create: { userId, accommodationId, rating, comment },
      update: { rating, comment },
    }),
  );
});
account.delete(
  "/accommodations/:id/reviews/me",
  requireAuth,
  async (req, res) => {
    await prisma.review.deleteMany({
      where: { userId: req.user!.id, accommodationId: uuid(req.params.id) },
    });
    res.sendStatus(204);
  },
);

account.get("/notifications", requireAuth, async (req, res) => {
  send(
    res,
    await prisma.notification.findMany({
      where: { OR: [{ userId: req.user!.id }, { userId: null }] },
      ...page(req.query),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  );
});
account.post("/admin/promotions", requireAdmin, async (req, res) => {
  const message = string(object(req.body).message, "message", 1000);
  send(res, await prisma.notification.create({ data: { message } }), 201);
});
account.patch("/notifications/:id", requireAuth, async (req, res) => {
  const { read } = object(req.body);
  if (read !== true) throw new ApiError(400, "Set read to true");
  send(
    res,
    await prisma.notification.update({
      where: { id: uuid(req.params.id), userId: req.user!.id },
      data: { readAt: new Date() },
    }),
  );
});
