import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

export const PASSWORD_FILE = join(__dirname, '../.auth/test-password.txt');

function generatePassword(): string {
  return `E2e_${randomBytes(12).toString('base64url')}!`;
}

/**
 * Reads the password written by global.setup, or generates a new one
 * (which global.setup then persists for workers to read).
 */
function getTestPassword(): string {
  try {
    return readFileSync(PASSWORD_FILE, 'utf-8').trim();
  } catch {
    return generatePassword();
  }
}

export const TEST_USER = {
  email: 'e2e-test@planscape.local',
  password: getTestPassword(),
  firstName: 'E2E',
  lastName: 'Test',
};

export function createSignupUser() {
  return {
    email: `e2e-signup-${Date.now()}@planscape.local`,
    password: generatePassword(),
    firstName: 'Signup',
    lastName: 'Test',
  };
}
