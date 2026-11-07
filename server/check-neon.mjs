import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  query_timeout: 10000,
});

try {
  console.log("Connecting to Neon through WebSockets...");

  const result = await pool.query(`
    SELECT
      current_database() AS database,
      to_regclass('auth.sessions') AS session_table,
      1 AS connected;
  `);

  console.table(result.rows);
} catch (error) {
  const details = (value) => {
    if (!value) return undefined;

    return {
      type: value.constructor?.name,
      name: value.name,
      message: value.message,
      code: value.code,
      address: value.address,
      port: value.port,
    };
  };

  console.dir(
    {
      error: details(error),
      underlyingError: details(error?.error),
      cause: details(error?.cause),
      individualErrors: error?.errors?.map(details),
    },
    { depth: null },
  );

  process.exitCode = 1;
} finally {
  await pool.end();
}
