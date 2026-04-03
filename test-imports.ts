console.error('[TEST] Starting import test...');

const modules = [
  './src/services/analytics/index.js',
  './src/utils/cwd.js',
  './src/utils/Shell.js',
  './src/utils/sinks.js',
  './src/bootstrap/state.js',
  './src/utils/env.js',
  './src/utils/envDynamic.js',
  './src/utils/log.js',
  './src/utils/config.js',
  './src/commands.js',
  './src/utils/releaseNotes.js',
  './src/services/SessionMemory/sessionMemory.js',
  './src/utils/auth.js',
];

async function testImports() {
  for (const mod of modules) {
    const start = Date.now();
    console.error(`[TEST] Importing ${mod}...`);
    try {
      const timer = setTimeout(() => {
        console.error(`[TEST] ⏰ ${mod} STUCK after 3s!`);
        process.exit(1);
      }, 3000);
      await import(mod);
      clearTimeout(timer);
      console.error(`[TEST] ✅ ${mod} (${Date.now() - start}ms)`);
    } catch (e: any) {
      console.error(`[TEST] ❌ ${mod}: ${e.message?.slice(0, 80)}`);
    }
  }
  console.error('[TEST] All imports done!');
  process.exit(0);
}

testImports();
