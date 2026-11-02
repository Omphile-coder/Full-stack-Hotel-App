import { Router } from "express";
import {
  getAccommodations,
  getAccommodationById,
} from "../controllers/accommodations.js";

const accommodationsRouter = Router();

accommodationsRouter.get("/", getAccommodations);

accommodationsRouter.get("/:id", getAccommodationById);

export default accommodationsRouter;