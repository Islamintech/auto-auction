import { createSelector } from "reselect";
import { LandingPageState } from "../../../lib/types/landing";

interface RootSlice {
  landingPage: LandingPageState;
}

const selectLanding = (state: RootSlice) => state.landingPage;

export const retrieveCars = createSelector(selectLanding, (s) => s.cars);
export const retrieveSavedIds = createSelector(selectLanding, (s) => s.savedIds);
