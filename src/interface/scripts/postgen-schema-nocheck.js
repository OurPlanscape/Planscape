/**
 * Adds // @ts-nocheck to generated files that have known unfixable type issues:
 *
 * - v2/v2.service.ts: catch-all for untagged endpoints; contains geometry
 *   fields typed as `unknown` that conflict with HttpParams. Not imported
 *   anywhere — suppressed rather than fixed since tagging endpoints moves
 *   them out of this file anyway.
 */
const fs = require('fs');
const path = require('path');

const generatedDir = path.join(__dirname, '..', 'src', 'app', 'api', 'generated');

const SUPPRESS = new Set([
  path.join(generatedDir, 'v2', 'v2.service.ts'),
]);

function addNoCheck(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('// @ts-nocheck')) {
    fs.writeFileSync(filePath, '// @ts-nocheck\n' + content);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.ts') && SUPPRESS.has(full)) {
      addNoCheck(full);
    }
  }
}

walk(generatedDir);
