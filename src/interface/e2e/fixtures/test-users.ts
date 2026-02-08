export const TEST_USER = {
  email: 'e2e-test@planscape.local',
  password: 'E2eTestPass123!',
  firstName: 'E2E',
  lastName: 'Test',
};

export function createSignupUser() {
  return {
    email: `e2e-signup-${Date.now()}@planscape.local`,
    password: 'E2eSignUp456!',
    firstName: 'Signup',
    lastName: 'Test',
  };
}
