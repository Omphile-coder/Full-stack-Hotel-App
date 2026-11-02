import prisma from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface AccommodationFilters {
  location?: string;
  minPrice?: string;
  maxPrice?: string;
}

export async function findPublishedAccommodationById(id: string) {
  const accommodation = await prisma.accommodation.findFirst({
    where: {
      id,
      isPublished: true,
    },
    select: {
      id: true,
      name: true,
      city: true,
      tagline: true,
      description: true,
      address: true,
      latitude: true,
      longitude: true,
      starRating: true,
      facilities: true,
      policies: true,
      phoneNumber: true,
      email: true,

      images: {
        orderBy: [
          { sortOrder: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          imageUrl: true,
          altText: true,
          sortOrder: true,
        },
      },

      rooms: {
        where: {
          isActive: true,
        },
        orderBy: [
          { pricePerNight: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          roomNumber: true,
          roomType: true,
          description: true,
          capacity: true,
          pricePerNight: true,
        },
      },
    },
  });

  if (!accommodation) {
    return null;
  }

  const coverImage = accommodation.images[0];
  const cheapestRoom = accommodation.rooms[0];

  return {
    ...accommodation,

    latitude: Number(accommodation.latitude),
    longitude: Number(accommodation.longitude),

    coverImage: coverImage
      ? {
          imageUrl: coverImage.imageUrl,
          altText: coverImage.altText,
        }
      : null,

    rooms: accommodation.rooms.map((room) => ({
      ...room,
      pricePerNight: room.pricePerNight.toFixed(2),
    })),

    fromPrice: cheapestRoom
      ? cheapestRoom.pricePerNight.toFixed(2)
      : null,

    currency: "ZAR",
  };
}

export async function listPublishedAccommodations(
  filters: AccommodationFilters = {},
) {
  const where: Prisma.AccommodationWhereInput = {
    isPublished: true,
  };

  if (filters.location) {
    where.city = {
      contains: filters.location,
      mode: "insensitive",
    };
  }

  const roomWhere: Prisma.RoomWhereInput = {
  isActive: true,
};

const hasPriceFilter =
  filters.minPrice !== undefined ||
  filters.maxPrice !== undefined;

if (hasPriceFilter) {
  roomWhere.pricePerNight = {
    ...(filters.minPrice !== undefined
      ? { gte: filters.minPrice }
      : {}),

    ...(filters.maxPrice !== undefined
      ? { lte: filters.maxPrice }
      : {}),
  };

  where.rooms = {
    some: roomWhere,
  };
  }
  
  const accommodations = await prisma.accommodation.findMany({
    where,
    orderBy: [
      { name: "asc" },
      { id: "asc" },
    ],
    take: 20,
    select: {
      id: true,
      name: true,
      city: true,
      tagline: true,
      description: true,
      starRating: true,

      images: {
        orderBy: [
          { sortOrder: "asc" },
          { id: "asc" },
        ],
        take: 1,
        select: {
          imageUrl: true,
          altText: true,
        },
      },

     rooms: {
  where: roomWhere,
        orderBy: [
          { pricePerNight: "asc" },
          { id: "asc" },
        ],
        take: 1,
        select: {
          pricePerNight: true,
        },
      },
    },
  });

  return accommodations.map((accommodation) => {
    const { images, rooms, ...hotel } = accommodation;

    return {
      ...hotel,
      coverImage: images[0] ?? null,
      fromPrice: rooms[0]?.pricePerNight.toFixed(2) ?? null,
      currency: "ZAR",
    };
  });
}