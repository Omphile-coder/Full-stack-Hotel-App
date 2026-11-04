import { Router } from "express";
import {
  getAccommodations,
  getAccommodationById,
} from "../controllers/accommodations.js";

import { getRoomsByAccommodation, createRoom } from "../controllers/rooms.js";

import { requireAuth, requireAdmin } from "../middleware/auth.js";

const accommodationsRouter = Router();

accommodationsRouter.get("/", getAccommodations);
accommodationsRouter.get("/:id/rooms", getRoomsByAccommodation);
accommodationsRouter.get("/:id", getAccommodationById);

accommodationsRouter.post("/:id/rooms", requireAuth, requireAdmin, createRoom);

export default accommodationsRouter;
