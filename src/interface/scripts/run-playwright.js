const { spawnSync } = require('node:child_process');
const path = require('node:path');

const isMacArm = process.platform === 'darwin' && process.arch === 'arm64';
const env = { ...process.env };

if (isMacArm) {
  env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE =
    env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ?? 'mac-arm64';
}

const cliPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@playwright',
  'test',
  'cli.js'
);
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [cliPath, ...args], {
  stdio: 'inherit',
  env,
});

process.exit(result.status ?? 1);
