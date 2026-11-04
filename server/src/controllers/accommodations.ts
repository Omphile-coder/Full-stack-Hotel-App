import { ApiError, page } from "../api.js";
import type { RequestHandler } from "express";
import type { Request, Response } from "express";
import {
  listPublishedAccommodations,
  findPublishedAccommodationById,
} from "../services/accommodations.js";




export async function getAccommodationById(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    res.status(400).json({
      success: false,
      message: "Accommodation ID must be a valid UUID",
    });
    return;
  }

  try {
    const accommodation =
      await findPublishedAccommodationById(id);

    if (!accommodation) {
      res.status(404).json({
        success: false,
        message: "Accommodation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: accommodation,
    });
  } catch (error) {
    console.error(
      "Failed to retrieve accommodation:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to retrieve accommodation",
    });
  }
}

export const getAccommodations: RequestHandler = async (
  req,
  res,
) => {
  const {
    location: rawLocation,
    minPrice: rawMinPrice,
    maxPrice: rawMaxPrice,
  } = req.query;

  const parameters = [
    ["location", rawLocation],
    ["minPrice", rawMinPrice],
    ["maxPrice", rawMaxPrice],
  ] as const;

  for (const [name, value] of parameters) {
    if (value !== undefined && typeof value !== "string") {
      res.status(400).json({
        success: false,
        message: `${name} must be a single text value`,
      });
      return;
    }
  }

  const location =
    typeof rawLocation === "string"
      ? rawLocation.trim()
      : undefined;

  const minPrice =
    typeof rawMinPrice === "string"
      ? rawMinPrice.trim()
      : undefined;

  const maxPrice =
    typeof rawMaxPrice === "string"
      ? rawMaxPrice.trim()
      : undefined;

  if (location !== undefined && location.length > 100) {
    res.status(400).json({
      success: false,
      message: "Location must not exceed 100 characters",
    });
    return;
  }

  const pricePattern =
    /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/;

  for (const [name, value] of [
    ["minPrice", minPrice],
    ["maxPrice", maxPrice],
  ] as const) {
    if (value !== undefined && !pricePattern.test(value)) {
      res.status(400).json({
        success: false,
        message:
          `${name} must be between 0 and 99999999.99, ` +
          "with no more than 2 decimal places",
      });
      return;
    }
  }

  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    Number(minPrice) > Number(maxPrice)
  ) {
    res.status(400).json({
      success: false,
      message: "minPrice must not exceed maxPrice",
    });
    return;
  }

  const numericFilter = (name: string, max: number) => {
    const value = req.query[name];
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max) {
      throw new ApiError(400, name + " must be an integer from 1 to " + max);
    }
    return Number(value);
  };
  const minStars = numericFilter("minStars", 5);
  const minCapacity = numericFilter("minCapacity", 1000);
  const offset = page(req.query).skip;
  try {
    const accommodations = await listPublishedAccommodations({
      minStars,
      minCapacity,
      offset,
      ...(location ? { location } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    });

    res.status(200).json({
      success: true,
      count: accommodations.length,
      data: accommodations,
    });
  } catch (error: unknown) {
    console.error("Failed to list accommodations:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve accommodations",
    });
  }
};
