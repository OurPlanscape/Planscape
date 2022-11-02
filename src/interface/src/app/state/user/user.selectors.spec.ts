import { AppState } from './../app.reducer';
import { Region } from '../../types'
import { userRegionSelector } from './user.selectors';

describe('userSelectors', () => {
  let state: AppState;

  beforeEach(() => {
    state = {
      user: {
        currentUser: undefined,
        region: Region.CENTRAL_COAST,
      }
    };
  });

  it('userRegionSelector should get region', () => {
    expect(userRegionSelector(state)).toEqual(state.user.region);
  });
});
