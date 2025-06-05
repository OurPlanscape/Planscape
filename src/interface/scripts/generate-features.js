// File: scripts/generate-features.js
/* eslint-env node, es6 */
const fs = require('fs');
const path = require('path');

//
// 1. Locate ".features.env" at the repo root.
//
const envPath = path.resolve(__dirname, '../../../.features.env');
if (!fs.existsSync(envPath)) {
  console.error(`✖ .features.env not found at ${envPath}`);
  process.exit(1);
}

//
// 2. Read & split into lines, ignoring blank lines and comments.
//
const lines = fs
  .readFileSync(envPath, 'utf-8')
  .split(/\r?\n/)
  .filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#');
  });

//
// 3. Parse each "KEY=VALUE" into an object of booleans.
//
const entries = {};
lines.forEach((line) => {
  const [rawKey, ...rest] = line.split('=');
  if (!rawKey) return;
  const key = rawKey.trim();
  const rawValue = rest.join('=').trim().toLowerCase();
  const value = rawValue === 'true';
  entries[key] = value;
});

//
// 4. Write JSON to "src/assets/features.json"
//
const outPath = path.resolve(__dirname, '../src/app/features/features.json');
fs.writeFileSync(outPath, JSON.stringify(entries, null, 2), 'utf-8');
console.log(`✔  Generated ${path.relative(process.cwd(), outPath)}`);
