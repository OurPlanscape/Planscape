import { createAction, props } from '@ngrx/store';

import { Region } from '../../types'

/**
 * Actions are dispatched by components to make changes to state.
 *
 * Each ngrx action has a type and an optional payload:
 * The type is a string that represents the type of action that will be
 * dispatched to the store, and the payload (props) adds any data needed for
 * the action.
 */

export enum UserActionType {
  USER_UPDATE_REGION = '[USER] update region',
}

/** Action for updating the user's selected region. */
export const userUpdateRegionAction = createAction(
  UserActionType.USER_UPDATE_REGION,
  props<{ region: Region }>(),
);
