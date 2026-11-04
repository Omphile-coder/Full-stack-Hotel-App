import type { ErrorRequestHandler, Response } from "express";
import { Prisma } from "./generated/prisma/client.js";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

export function string(value: unknown, field: string, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, field + " must contain 1 to " + max + " characters");
  }
  return value.trim();
}

export function integer(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, field + " must be an integer between " + min + " and " + max);
  }
  return value;
}

export function uuid(value: unknown) {
  if (typeof value !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)) {
    throw new ApiError(400, "Expected a valid UUID");
  }
  return value.toLowerCase();
}

export function bool(value: unknown, field: string) {
  if (typeof value !== "boolean") throw new ApiError(400, field + " must be a boolean");
  return value;
}

export function page(query: Record<string, unknown>) {
  const offset = query.offset === undefined ? 0 : Number(string(query.offset, "offset", 10));
  return { skip: integer(offset, "offset", 0, 1000000), take: 20 };
}

export function send(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data });
}

export const apiErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  let status = 500;
  let message = "Unexpected server error";
  if (error instanceof ApiError) {
    ({ status, message } = error);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") [status, message] = [404, "Resource not found"];
    if (["P2002", "P2003", "P2034"].includes(error.code)) {
      [status, message] = [409, "Request conflicts with existing data or another update"];
    }
  } else if (error?.type === "entity.parse.failed") {
    [status, message] = [400, "Invalid JSON"];
  } else if (error?.type === "entity.too.large") {
    [status, message] = [413, "Request body is too large"];
  }
  if (status === 500) console.error("API error", error?.name, error?.code);
  res.status(status).json({ success: false, message });
};
