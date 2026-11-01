import prisma from "../config/prisma.js";

async function checkDatabase() {
  try {
    await prisma.$connect();

    const accommodationCount = await prisma.accommodation.count();
    const roomCount = await prisma.room.count();

    console.log("Connected to Halden's Neon database.");
    console.log("Accommodations:", accommodationCount);
    console.log("Rooms:", roomCount);
  } catch (error) {
    console.error("Database connection check failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await checkDatabase();
