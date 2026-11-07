import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { ApiError } from "../api.js";

const scryptOptions = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const dummyHash = `${"0".repeat(32)}:${"0".repeat(128)}`;
let activeHashes = 0;

/** Cap parallel hashes so bursts of login attempts cannot exhaust server memory. */
async function derive(password: string, salt: Buffer) {
  if (activeHashes >= 3)
    throw new ApiError(503, "Sign-in is busy. Please try again shortly.");
  activeHashes++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, scryptOptions, (error, key) => {
        if (error) reject(error);
        else resolve(key);
      });
    });
  } finally {
    activeHashes--;
  }
}

/** Store a fresh random salt alongside the derived key. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Spend comparable hashing time when the email has no password account. */
export async function matchesPassword(
  password: string,
  stored?: string | null,
) {
  const [salt, expected] = (stored ?? dummyHash).split(":");
  if (
    !salt ||
    !expected ||
    !/^[\da-f]{32}$/.test(salt) ||
    !/^[\da-f]{128}$/.test(expected)
  )
    return false;
  const actual = await derive(password, Buffer.from(salt, "hex"));
  return (
    timingSafeEqual(actual, Buffer.from(expected, "hex")) && Boolean(stored)
  );
}
