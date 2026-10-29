import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is missing from .env");
}

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 20_000,
});

const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 20_000,
    timeout: 30_000,
  },
});

// Fixed IDs prevent duplicate seed records when this script is rerun.
const accommodationId = "10000000-0000-4000-8000-000000000001";

async function main() {
  console.log("Connecting to the database...");

  await prisma.$queryRaw`SELECT 1`;

  console.log("Database connected. Starting seed transaction...");

  await prisma.$transaction(async (tx) => {
    const accommodationData = {
      name: "Halden Cape Town",
      city: "Cape Town",
      tagline: "Between mountain and ocean",
      description:
        "A quiet retreat with sea-facing suites, a rooftop pool and long slow breakfasts.",
      address: "12 Kloof Nek Road, Cape Town",
      latitude: "-33.934000",
      longitude: "18.405000",
      starRating: 5,
      facilities: [
        "Free Wi-Fi",
        "Pool",
        "Restaurant",
        "Spa",
        "Parking",
        "Airport shuttle",
      ],
      policies: "Check-in from 14:00. Check-out by 11:00. No smoking.",
      email: "capetown@halden.example",
      isPublished: true,
    };

    await tx.accommodation.upsert({
      where: {
        id: accommodationId,
      },
      update: accommodationData,
      create: {
        id: accommodationId,
        ...accommodationData,
      },
    });

    const images = [
      {
        id: "20000000-0000-4000-8000-000000000001",
        imageUrl: "/images/cape-town.jpg",
        altText: "Hotel terrace overlooking Table Mountain",
        sortOrder: 0,
      },
      {
        id: "20000000-0000-4000-8000-000000000002",
        imageUrl: "/images/room.jpg",
        altText: "Halden guest room",
        sortOrder: 1,
      },
    ];

    for (const image of images) {
      const { id, ...imageData } = image;

      await tx.accommodationImage.upsert({
        where: {
          id,
        },
        update: {
          ...imageData,
          accommodationId,
        },
        create: {
          id,
          ...imageData,
          accommodationId,
        },
      });
    }

    const roomData = {
      roomType: "Classic Room",
      description: "Queen bed, garden or city view, rain shower.",
      capacity: 2,
      pricePerNight: "2400.00",
      isActive: true,
    };

    await tx.room.upsert({
      where: {
        accommodationId_roomNumber: {
          accommodationId,
          roomNumber: "101",
        },
      },
      update: roomData,
      create: {
        accommodationId,
        roomNumber: "101",
        ...roomData,
      },
    });
  });

  console.log("Seed complete: Cape Town hotel, 2 images and room 101.");
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });