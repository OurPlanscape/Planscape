import { state } from '@angular/animations';
import { ActionReducerMap } from '@ngrx/store';
import { UserState, userReducer } from './user/user.reducer';

/** The interface for the entire ngrx store. */
export interface AppState {
 user: UserState;
}
/**
 * The main app reducer that combines all other reducers and returns
 * the global state object:
 *
 * {
 *   user: {
 *     currentUser: {
 *      id: ...,
 *      username: ...,
 *      region: undefined,
 *      ...,
 *     }
 *   }
 *  ...
 * }
 */
export const appReducerMap: ActionReducerMap<AppState> = {
  user: userReducer,
};
