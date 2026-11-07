import prisma from "../config/prisma.js";

export interface CreateRoomInput {
  accommodationId: string;
  roomNumber: string;
  roomType: string;
  description: string | null;
  capacity: number;
  pricePerNight: string;
  isActive: boolean;
}

export const createRoomForAccommodation = async (data: CreateRoomInput) => {
  return prisma.room.create({
    data: {
      accommodationId: data.accommodationId,
      roomNumber: data.roomNumber,
      roomType: data.roomType,
      description: data.description,
      capacity: data.capacity,
      pricePerNight: data.pricePerNight,
      isActive: data.isActive,
    },
  });
};

export const listActiveRoomsByAccommodationId = async (
  accommodationId: string,
) => {
  return prisma.room.findMany({
    where: {
      accommodationId,
      isActive: true,
    },

    select: {
      id: true,
      accommodationId: true,
      roomNumber: true,
      roomType: true,
      description: true,
      capacity: true,
      pricePerNight: true,
      isActive: true,
    },

    orderBy: [{ pricePerNight: "asc" }, { roomNumber: "asc" }],
  });
};
