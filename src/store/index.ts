import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../services/baseApi';
import '../services/shopCreationRefreshesMe';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
