
import { unlinkSync } from 'fs';
import { PASSWORD_FILE, EMAIL_FILE } from './fixtures/test-users';

export default async function globalTeardown() {
  // keep the user files
  // try { unlinkSync(PASSWORD_FILE); } catch {}
  // try { unlinkSync(EMAIL_FILE); } catch {}
}
