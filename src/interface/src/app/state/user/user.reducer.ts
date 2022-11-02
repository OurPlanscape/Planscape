import {createReducer, on} from '@ngrx/store';

import { Region, User } from '../../types'
import * as actions from './user.actions';

/**
 * A reducer is called when an action is dispatched and returns
 * the state.
 * Each reducer function takes the action dispatched, the current
 * state, and determines whether to return a newly modified state or the
 * original state.
 */

export interface UserState {
  currentUser?: User;
  region?: Region;
}

export const initialState: UserState = {
  currentUser: undefined,
  region: undefined,
};

export const userReducer = createReducer(
  initialState,
  on(actions.userUpdateRegionAction, (state, {region}): UserState => {
    return {
      ...state,
      region,
    }
  }),
)
