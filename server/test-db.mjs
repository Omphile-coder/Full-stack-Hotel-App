import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is missing");
}

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 20_000,
  query_timeout: 20_000,
});

try {
  console.log("Opening PostgreSQL connection...");
  await client.connect();

  console.log("Connected. Running SELECT 1...");
  const result = await client.query("SELECT 1 AS connected");

  console.log("Query successful:", result.rows);
} catch (error) {
  console.error("Database test failed:", {
    code: error.code,
    message: error.message,
    cause: error.cause?.message,
  });

  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}