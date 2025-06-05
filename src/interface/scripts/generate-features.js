/* eslint-env node, es6 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env'), // explicitly load project-root .env
});
//
// 1. Read feature flags from an ENV variable called FEATURE_FLAGS
//    (comma‐separated list). E.g.:
//    FEATURE_FLAGS="STATEWIDE_SCENARIOS,NEW_DASHBOARD"
//
const rawList = process.env.FEATURE_FLAGS || '';
const keys = rawList
  .split(',')
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

//
// 2. Build an object where each listed flag is true.
//    Any flag not in FEATURE_FLAGS will simply be absent (treated as false).
//
const entries = {};
keys.forEach((key) => {
  entries[key] = true;
});

//
// 3. Write JSON to "src/app/features/features.json"
//
const outPath = path.resolve(
  __dirname,
  '../src/app/features/features.generated.json'
);
fs.writeFileSync(outPath, JSON.stringify(entries, null, 2), 'utf-8');
console.log(`✔  Generated ${path.relative(process.cwd(), outPath)}`);
