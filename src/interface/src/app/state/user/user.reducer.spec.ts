import { initialState, UserState, userReducer } from './user.reducer';
import * as userActions from './user.actions';
import { Region } from '../../types'

describe('userReducer', () => {
  let state: UserState;

  beforeEach(() => {
    state = initialState;
  });

  it('should return state untouched if action is not meant for this reducer',
      () => {
    const unrelatedAction = {type: 'unrelated'};
    const newState = userReducer(state, unrelatedAction);

    // Check that it's same instance
    expect(newState).toBe(state);
    // Check that state wasn't mutated - deep equality check.
    expect(newState).toEqual(state);
  });

  it('should update user selected region', () => {
    const testRegion = Region.SIERRA_NEVADA;
    const action = userActions.userUpdateRegionAction({region: testRegion});

    const newState = userReducer(state, action);

    // State should be a new instance
    expect(newState).not.toBe(state);
    expect(newState).toEqual(jasmine.objectContaining({
      region: testRegion,
    }));
  });
});
