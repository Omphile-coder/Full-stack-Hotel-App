import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is missing");
}

try {
  console.log("Testing Neon over HTTPS...");

  const sql = neon(connectionString);

  const rows = await sql`SELECT 1 AS connected`;

  console.log("Query successful:", rows);
} catch (error) {
  const source = error.sourceError ?? error.cause;
  const cause = source?.cause;

  console.error("HTTPS connection details:", {
    message: error.message,
    sourceMessage: source?.message,
    sourceCode: source?.code,
    causeMessage: cause?.message,
    causeCode: cause?.code,
    nestedErrors: cause?.errors?.map((item) => ({
      code: item.code,
      message: item.message,
      address: item.address,
      port: item.port,
    })),
  });

  process.exitCode = 1;
}