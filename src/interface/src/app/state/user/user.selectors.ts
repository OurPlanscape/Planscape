import { createSelector } from '@ngrx/store';
import { AppState } from '../app.reducer';

/**
 * Selectors are pure functions that components call to get specific data from
 * the store.
 */

export const userStateSelector = (state: AppState) => state.user;

export const userRegionSelector = createSelector(
  userStateSelector,
  (userState) => {
    return userState.region;
  }
);
