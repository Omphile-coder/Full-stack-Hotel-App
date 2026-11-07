import { createApi,fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { AdminSummary,Booking,Envelope,Favorite,Hotel,Notification,ReservationInput,Reviews,Room,User } from './types';

/** Every API call includes the HTTP-only session cookie managed by the browser. */
export const apiBase = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

const unwrap = <T,>(response: Envelope<T>) => response.data;

const hotelTags = ['Hotels'] as const;

const bookingTags = ['Bookings', 'Notifications'] as const;

/** RTK Query shares server data and refreshes affected screens after successful writes. */
export const api = createApi({
  reducerPath: 'hotelApi',
  baseQuery: fetchBaseQuery({ baseUrl: apiBase, credentials: 'include', timeout: 15000 }),
  tagTypes: ['User', 'Hotels', 'Bookings', 'Favorites', 'Reviews', 'Notifications'],
  endpoints: (build) => ({
    adminSummary: build.query<AdminSummary, void>({
      query: () => '/admin/summary', transformResponse: unwrap<AdminSummary>,
      providesTags: ['Hotels', 'Bookings'],
    }),
    me: build.query<User, void>({
      query: () => '/me', transformResponse: unwrap<User>, providesTags: ['User'],
    }),
    updateMe: build.mutation<User, { name: string; phoneNumber: string | null }>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      transformResponse: unwrap<User>, invalidatesTags: ['User'],
    }),
    logout: build.mutation<void, void>({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    hotels: build.query<Hotel[], Record<string, string | number>>({
      query: (params) => ({ url: '/accommodations', params }),
      transformResponse: unwrap<Hotel[]>, providesTags: hotelTags,
    }),
    hotel: build.query<Hotel, string>({
      query: (id) => '/accommodations/' + id, transformResponse: unwrap<Hotel>, providesTags: hotelTags,
    }),
    availability: build.query<Room[], { id: string; checkInDate: string; checkOutDate: string }>({
      // Combine API pages so availability and room selection cover every physical room.
      async queryFn({ id, ...params }, _queryApi, _extraOptions, baseQuery) {
        const rooms: Room[] = [];
        for (let offset = 0; offset <= 1000000; offset += 20) {
          const response = await baseQuery({ url: '/accommodations/' + id + '/availability', params: { ...params, offset } });
          if (response.error) return { error: response.error };
          const items = (response.data as Envelope<Room[]>).data;
          rooms.push(...items);
          if (items.length < 20) break;
        }
        return { data: rooms };
      },
      providesTags: ['Bookings', 'Hotels'],
    }),
    favorites: build.query<Favorite[], number>({
      query: (offset) => ({ url: '/favorites', params: { offset } }),
      transformResponse: unwrap<Favorite[]>, providesTags: ['Favorites'],
    }),
    favoriteStatus: build.query<boolean, string>({
      // Scan paginated favourites so a saved hotel is recognised beyond the first page.
      async queryFn(id, _queryApi, _extraOptions, baseQuery) {
        for (let offset = 0; offset <= 1000000; offset += 20) {
          const response = await baseQuery({ url: '/favorites', params: { offset } });
          if (response.error) return { error: response.error };
          const items = (response.data as Envelope<Favorite[]>).data;
          if (items.some(item => item.accommodationId === id)) return { data: true };
          if (items.length < 20) return { data: false };
        }
        return { data: false };
      },
      providesTags: ['Favorites'],
    }),
    saveFavorite: build.mutation<void, { id: string; saved: boolean }>({
      query: ({ id, saved }) => ({ url: '/favorites/' + id, method: saved ? 'DELETE' : 'PUT' }),
      invalidatesTags: ['Favorites'],
    }),
    reviews: build.query<Reviews, { id: string; offset: number }>({
      query: ({ id, offset }) => ({ url: '/accommodations/' + id + '/reviews', params: { offset } }),
      transformResponse: unwrap<Reviews>, providesTags: ['Reviews'],
    }),
    writeReview: build.mutation<void, { id: string; rating: number; comment: string | null }>({
      query: ({ id, ...body }) => ({ url: '/accommodations/' + id + '/reviews/me', method: 'PUT', body }),
      invalidatesTags: ['Reviews'],
    }),
    deleteReview: build.mutation<void, string>({
      query: (id) => ({ url: '/accommodations/' + id + '/reviews/me', method: 'DELETE' }),
      invalidatesTags: ['Reviews'],
    }),
    bookings: build.query<Booking[], number>({
      query: (offset) => ({ url: '/bookings', params: { offset } }),
      transformResponse: unwrap<Booking[]>, providesTags: ['Bookings'],
    }),
    booking: build.query<Booking, string>({
      query: (id) => '/bookings/' + id, transformResponse: unwrap<Booking>, providesTags: ['Bookings'],
    }),
    createBooking: build.mutation<Booking, ReservationInput>({
      query: (body) => ({ url: '/bookings', method: 'POST', body }),
      transformResponse: unwrap<Booking>, invalidatesTags: bookingTags,
    }),
    checkout: build.mutation<{ url: string; paymentId: string }, string>({
      query: (id) => ({ url: '/bookings/' + id + '/checkout', method: 'POST' }),
      transformResponse: unwrap<{ url: string; paymentId: string }>, invalidatesTags: ['Bookings'],
    }),
    verifyPayment: build.mutation<{ bookingId: string; paymentId: string; status: 'PENDING' | 'COMPLETED' | 'FAILED' }, string>({
      query: (reference) => ({ url: '/payments/paystack/verify', method: 'POST', body: { reference } }),
      transformResponse: unwrap<{ bookingId: string; paymentId: string; status: 'PENDING' | 'COMPLETED' | 'FAILED' }>,
      invalidatesTags: ['Bookings', 'Notifications'],
    }),
    notifications: build.query<Notification[], number>({
      query: (offset) => ({ url: '/notifications', params: { offset } }),
      transformResponse: unwrap<Notification[]>, providesTags: ['Notifications'],
    }),
    readNotification: build.mutation<void, string>({
      query: (id) => ({ url: '/notifications/' + id, method: 'PATCH', body: { read: true } }),
      invalidatesTags: ['Notifications'],
    }),
    adminHotels: build.query<Hotel[], number>({
      query: (offset) => ({ url: '/admin/accommodations', params: { offset } }),
      transformResponse: unwrap<Hotel[]>, providesTags: hotelTags,
    }),
    adminHotel: build.query<Hotel, string>({
      query: (id) => '/admin/accommodations/' + id, transformResponse: unwrap<Hotel>, providesTags: hotelTags,
    }),
    writeHotel: build.mutation<Hotel, { id?: string; body: Partial<Hotel> }>({
      query: ({ id, body }) => ({ url: '/accommodations' + (id ? '/' + id : ''), method: id ? 'PATCH' : 'POST', body }),
      transformResponse: unwrap<Hotel>, invalidatesTags: hotelTags,
    }),
    unpublishHotel: build.mutation<void, string>({
      query: (id) => ({ url: '/accommodations/' + id, method: 'DELETE' }), invalidatesTags: hotelTags,
    }),
    writeRoom: build.mutation<Room, { hotelId: string; id?: string; body: Partial<Room> }>({
      query: ({ hotelId, id, body }) => ({
        url: '/accommodations/' + hotelId + '/rooms' + (id ? '/' + id : ''),
        method: id ? 'PATCH' : 'POST', body,
      }), transformResponse: unwrap<Room>, invalidatesTags: hotelTags,
    }),
    deactivateRoom: build.mutation<void, { hotelId: string; id: string }>({
      query: ({ hotelId, id }) => ({ url: '/accommodations/' + hotelId + '/rooms/' + id, method: 'DELETE' }),
      invalidatesTags: hotelTags,
    }),
    adminBookings: build.query<Booking[], number>({
      query: (offset) => ({ url: '/admin/bookings', params: { offset } }),
      transformResponse: unwrap<Booking[]>, providesTags: ['Bookings'],
    }),
    adminBooking: build.query<Booking, string>({
      query: (id) => '/admin/bookings/' + id, transformResponse: unwrap<Booking>, providesTags: ['Bookings'],
    }),
    updateBooking: build.mutation<Booking, { id: string; body: Partial<ReservationInput> & { status: string } }>({
      query: ({ id, body }) => ({ url: '/admin/bookings/' + id, method: 'PATCH', body }),
      transformResponse: unwrap<Booking>, invalidatesTags: bookingTags,
    }),
    promotion: build.mutation<void, string>({
      query: (message) => ({ url: '/admin/promotions', method: 'POST', body: { message } }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});
