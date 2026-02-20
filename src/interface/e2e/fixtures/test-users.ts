import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

export const PASSWORD_FILE = join(__dirname, '../.auth/test-password.txt');
export const EMAIL_FILE = join(__dirname, '../.auth/test-email.txt');

function generatePassword(): string {
  return `E2e_${randomBytes(12).toString('base64url')}!`;
}

function generateEmail(): string {
  return `e2e-test-${randomBytes(6).toString('hex')}@planscape.local`;
}

/**
 * Reads the value written by global.setup, or generates a new one
 * (which global.setup then persists for workers to read).
 */
function getTestPassword(): string {
  try {
    return readFileSync(PASSWORD_FILE, 'utf-8').trim();
  } catch {
    return generatePassword();
  }
}

function getTestEmail(): string {
  try {
    return readFileSync(EMAIL_FILE, 'utf-8').trim();
  } catch {
    return generateEmail();
  }
}

export const TEST_USER = {
  email: getTestEmail(),
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
