import type { User as DatabaseUser } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface User
      extends Pick<
        DatabaseUser,
        "id" | "name" | "email" | "profilePicture" | "role"
      > {
        passwordVersion?: number;
      }
  }
}

export {};