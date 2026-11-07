import type { Request, Response } from "express";

import { findPublishedAccommodationById } from "../services/accommodations.js";

import {
  listActiveRoomsByAccommodationId,
  createRoomForAccommodation,
} from "../services/rooms.js";

import { Prisma } from "../generated/prisma/client.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getRoomsByAccommodation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    res.status(400).json({
      success: false,
      message: "Accommodation ID must be a valid UUID",
    });

    return;
  }

  try {
    const accommodation = await findPublishedAccommodationById(id);

    if (!accommodation) {
      res.status(404).json({
        success: false,
        message: "Accommodation not found",
      });

      return;
    }

    const rooms = await listActiveRoomsByAccommodationId(id);

    res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    console.error("Failed to fetch accommodation rooms:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch rooms",
    });
  }
};

export const createRoom = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    res.status(400).json({
      success: false,
      message: "Accommodation ID must be a valid UUID",
    });
    return;
  }

  const body: unknown = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({
      success: false,
      message: "Request body must be a JSON object",
    });
    return;
  }

  const {
    roomNumber,
    roomType,
    description,
    capacity,
    pricePerNight,
    isActive,
  } = body as Record<string, unknown>;

  if (
    typeof roomNumber !== "string" ||
    roomNumber.trim().length === 0 ||
    roomNumber.trim().length > 50
  ) {
    res.status(400).json({
      success: false,
      message: "Room number must contain between 1 and 50 characters",
    });
    return;
  }

  if (
    typeof roomType !== "string" ||
    roomType.trim().length === 0 ||
    roomType.trim().length > 100
  ) {
    res.status(400).json({
      success: false,
      message: "Room type must contain between 1 and 100 characters",
    });
    return;
  }

  if (
    description !== undefined &&
    description !== null &&
    (typeof description !== "string" || description.trim().length > 2000)
  ) {
    res.status(400).json({
      success: false,
      message: "Description must be text of at most 2000 characters",
    });
    return;
  }

  if (
    typeof capacity !== "number" ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 2147483647
  ) {
    res.status(400).json({
      success: false,
      message: "Capacity must be a positive integer within the database limit",
    });
    return;
  }

  if (
    typeof pricePerNight !== "string" ||
    !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(pricePerNight) ||
    Number(pricePerNight) <= 0
  ) {
    res.status(400).json({
      success: false,
      message:
        "Price per night must be a decimal string between 0.01 and 99999999.99",
    });
    return;
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    res.status(400).json({
      success: false,
      message: "isActive must be true or false",
    });
    return;
  }

  try {
    const room = await createRoomForAccommodation({
      accommodationId: id,
      roomNumber: roomNumber.trim(),
      roomType: roomType.trim(),
      description:
        typeof description === "string" ? description.trim() || null : null,
      capacity,
      pricePerNight,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: room,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        res.status(409).json({
          success: false,
          message:
            "A room with this room number already exists in this accommodation",
        });
        return;
      }

      if (error.code === "P2003") {
        res.status(404).json({
          success: false,
          message: "Accommodation not found",
        });
        return;
      }
    }

    console.error("Failed to create room:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create room",
    });
  }
};
