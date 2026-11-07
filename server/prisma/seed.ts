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

// Fixed IDs prevent duplicate records when the seed is rerun.
// Johannesburg and Winelands details include demonstration locations.
// Shared facilities, star ratings and room prices are development data.
const accommodations = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Black Clover Cape Town",
    city: "Cape Town",
    tagline: "Between mountain and ocean",
    description:
      "A quiet retreat with sea-facing suites, a rooftop pool and long slow breakfasts.",
    address: "12 Kloof Nek Road, Cape Town",
    latitude: "-33.934000",
    longitude: "18.405000",
    email: "capetown@halden.example",
    imageUrl: "/images/cape-town.jpg",
    imageAlt: "Hotel terrace overlooking Table Mountain",
    firstImageId: "20000000-0000-4000-8000-000000000001",
    roomImageId: "20000000-0000-4000-8000-000000000002",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Black Clover Johannesburg",
    city: "Johannesburg",
    tagline: "Calm in the heart of the city",
    description:
      "A peaceful city retreat with leafy gardens, comfortable rooms and a welcoming library bar.",
    address: "Parkhurst, Johannesburg — demonstration location",
    latitude: "-26.140000",
    longitude: "28.020000",
    email: "johannesburg@halden.example",
    imageUrl: "/images/johannesburg.jpg",
    imageAlt: "Black Clover Johannesburg lounge and library bar",
    firstImageId: "20000000-0000-4000-8000-000000000003",
    roomImageId: "20000000-0000-4000-8000-000000000004",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Black Clover Winelands",
    city: "Franschhoek",
    tagline: "Vineyards at your door",
    description:
      "A restored farmhouse among the vines, offering mountain views and a relaxed countryside stay.",
    address: "Franschhoek, Western Cape — demonstration location",
    latitude: "-33.910000",
    longitude: "19.120000",
    email: "winelands@halden.example",
    imageUrl: "/images/winelands.jpg",
    imageAlt: "White farmhouse surrounded by vineyards and mountains",
    firstImageId: "20000000-0000-4000-8000-000000000005",
    roomImageId: "20000000-0000-4000-8000-000000000006",
  },
];

async function main() {
  console.log("Connecting to the database...");

  await prisma.$queryRaw`SELECT 1`;

  console.log("Database connected. Starting seed transaction...");

  await prisma.$transaction(async (tx) => {
    for (const hotel of accommodations) {
      const accommodationData = {
        name: hotel.name,
        city: hotel.city,
        tagline: hotel.tagline,
        description: hotel.description,
        address: hotel.address,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
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
        email: hotel.email,
        isPublished: true,
      };

      await tx.accommodation.upsert({
        where: {
          id: hotel.id,
        },
        update: accommodationData,
        create: {
          id: hotel.id,
          ...accommodationData,
        },
      });

      const images = [
        {
          id: hotel.firstImageId,
          imageUrl: hotel.imageUrl,
          altText: hotel.imageAlt,
          sortOrder: 0,
        },
        {
          id: hotel.roomImageId,
          imageUrl: "/images/room.jpg",
          altText: `${hotel.name} guest room`,
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
            accommodationId: hotel.id,
          },
          create: {
            id,
            ...imageData,
            accommodationId: hotel.id,
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
            accommodationId: hotel.id,
            roomNumber: "101",
          },
        },
        update: roomData,
        create: {
          accommodationId: hotel.id,
          roomNumber: "101",
          ...roomData,
        },
      });
    }
  });

  console.log(
    "Seed complete: 3 Black Clover hotels, 6 images and 3 Classic rooms.",
  );
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
