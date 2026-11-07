
/** Shared response types mirror the Express API and keep components type-safe. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  phoneNumber?: string | null;
  profilePicture?: string | null;
}

export interface HotelImage { id?: string; imageUrl: string; altText?: string | null; sortOrder?: number }

export interface Room {
  id: string;
  accommodationId: string;
  roomNumber: string;
  roomType: string;
  description: string | null;
  capacity: number;
  pricePerNight: string;
  isActive?: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  tagline: string | null;
  description: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  starRating: number;
  facilities: string[];
  policies: string;
  phoneNumber: string | null;
  email: string | null;
  isPublished?: boolean;
  images?: HotelImage[];
  coverImage?: HotelImage | null;
  rooms?: Room[];
  fromPrice?: string | null;
}

export interface Payment { id: string; provider: string; providerReference: string | null; amount: string; currency: string; status: 'PENDING' | 'COMPLETED' | 'FAILED'; paidAt: string | null }

export interface Booking {
  id: string;
  userId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: string;
  status: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'CANCELLED';
  bookingRooms: { roomId: string; pricePerNight: string; room: Room & { accommodation: { id: string; name: string } } }[];
  payments: Payment[];
  user?: User;
}

export interface ReservationInput { checkInDate: string; checkOutDate: string; numberOfGuests: number; roomIds: string[] }

export interface Favorite { id: string; accommodationId: string; accommodation: Hotel }

export interface Review { id: string; rating: number; comment: string | null; user: Pick<User, 'name' | 'profilePicture'> }

export interface Reviews { reviews: Review[]; averageRating: number | null; reviewCount: number }

export interface Notification { id: string; message: string; readAt: string | null; createdAt: string; userId: string | null; bookingId: string | null }

export interface Envelope<T> { success: boolean; data: T }

export interface AdminSummary {
  hotels: number;
  publishedHotels: number;
  activeRooms: number;
  reservations: number;
  pendingReservations: number;
  receivedPayments: string;
  recentBookings: Booking[];
}
