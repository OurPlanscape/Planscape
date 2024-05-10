export const baseURL =
  Cypress.env('TEST_BASE_URL') || 'https://dev.planscape.org';
export const testUser = Cypress.env('TEST_USER1');
export const testPass = Cypress.env('TEST_PASS1');

export const urls = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  MAP: '/map',
};

export function randString(strlen: number) {
  let random_string = '';
  for (let i = 0; i < strlen; i++) {
    random_string += String.fromCharCode(Math.floor(Math.random() * 25 + 97));
  }
  return random_string;
}
