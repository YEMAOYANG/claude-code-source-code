console.error('[TEST] Importing print.ts...');
const timer = setTimeout(() => {
  console.error('[TEST] ⏰ STUCK after 5s importing print.ts!');
  process.exit(1);
}, 5000);

import('src/cli/print.js').then(() => {
  clearTimeout(timer);
  console.error('[TEST] ✅ print.ts imported successfully');
  process.exit(0);
}).catch(e => {
  clearTimeout(timer);
  console.error('[TEST] ❌', e.message);
  process.exit(1);
});
