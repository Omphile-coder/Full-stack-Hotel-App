import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface BookingDraft {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  roomCount: number;
  roomIds: string[];
}

export const emptyDraft: BookingDraft = {
  hotelId: '', checkInDate: '', checkOutDate: '', numberOfGuests: 2, roomCount: 1, roomIds: [],
};

const storageKey = 'halden-stay-draft';

/** Restore stay choices after Google redirects without persisting personal details. */
function restoreDraft(): BookingDraft {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (!saved || typeof saved !== 'object') return emptyDraft;
    const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
    return {
      hotelId: typeof saved.hotelId === 'string' ? saved.hotelId : '',
      checkInDate: date(saved.checkInDate),
      checkOutDate: date(saved.checkOutDate),
      numberOfGuests: Number.isInteger(saved.numberOfGuests) && saved.numberOfGuests > 0 && saved.numberOfGuests <= 1000 ? saved.numberOfGuests : 2,
      roomCount: Number.isInteger(saved.roomCount) && saved.roomCount > 0 && saved.roomCount <= 20 ? saved.roomCount : 1,
      roomIds: Array.isArray(saved.roomIds) ? saved.roomIds.filter((id: unknown) => typeof id === 'string').slice(0, 20) : [],
    };
  } catch { return emptyDraft; }
}

/** Redux keeps search choices and room selection consistent across the guest journey. */
export const bookingDraft = createSlice({
  name: 'bookingDraft',
  initialState: restoreDraft(),
  reducers: {
    chooseStay(state, action: PayloadAction<Partial<BookingDraft>>) {
      return { ...state, ...action.payload };
    },
    clearStay() { return { ...emptyDraft }; },
  },
});

export const { chooseStay, clearStay } = bookingDraft.actions;

/** Persist only the small stay draft so a full-page OAuth redirect can resume it. */
export function persistDraft(draft: BookingDraft) {
  try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); }
  catch { /* Booking still works when the browser blocks session storage. */ }
}
