import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './lib/api';
import { bookingDraft,persistDraft } from './lib/bookingDraft';

/** Central Redux store holds API data without storing session cookies or credentials. */
export const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer, bookingDraft: bookingDraft.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
let previousDraft = store.getState().bookingDraft;
// API cache updates do not need to write the unchanged draft back to storage.
store.subscribe(() => {
  const draft = store.getState().bookingDraft;
  if (draft !== previousDraft) {
    persistDraft(draft);
    previousDraft = draft;
  }
});

