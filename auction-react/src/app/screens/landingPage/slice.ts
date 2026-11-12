import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuctionCar, LandingPageState } from "../../../lib/types/landing";

const SAVED_KEY = "savedCarIds";

function loadSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function persistSavedIds(ids: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
}

const initialState: LandingPageState = {
  cars: [],
  savedIds: loadSavedIds(),
};

const landingPageSlice = createSlice({
  name: "landingPage",
  initialState,
  reducers: {
    setCars: (state, action: PayloadAction<AuctionCar[]>) => {
      state.cars = action.payload;
    },
    toggleSaved: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.savedIds = state.savedIds.includes(id)
        ? state.savedIds.filter((x) => x !== id)
        : [...state.savedIds, id];
      persistSavedIds(state.savedIds);
    },
  },
});

export const { setCars, toggleSaved } = landingPageSlice.actions;
export default landingPageSlice.reducer;
