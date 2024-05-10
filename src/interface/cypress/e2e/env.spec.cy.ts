import { baseURL, testUser, testPass } from '../support/util';

describe('Test environment has what it needs', () => {
  it('can read the url', () => {
    expect(baseURL.trim(), 'Base URL environment variable is empty').to.not.be
      .empty;
  });
  it('can read the user', () => {
    expect(testUser, 'User environment variable is empty').to.not.be.empty;
  });
  it('can read the pw', () => {
    expect(testPass, 'pw environment variable is empty').to.not.be.empty;
  });
});
