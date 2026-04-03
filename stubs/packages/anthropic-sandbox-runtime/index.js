const z = require('zod');

class SandboxManager {
  constructor() {}
  start() {}
  stop() {}
  // Static methods used by sandbox-adapter.ts
  static checkDependencies() { return { errors: ['stub: sandbox-runtime not available'], warnings: [] }; }
  static isSupportedPlatform() { return false; }
  static wrapWithSandbox(cmd, args, opts) { return { command: cmd, args: args || [], env: opts?.env || {} }; }
  static async initialize() {}
  static updateConfig() {}
  static reset() {}
  static getFsReadConfig() { return undefined; }
  static getFsWriteConfig() { return undefined; }
  static getNetworkRestrictionConfig() { return undefined; }
  static getIgnoreViolations() { return undefined; }
  static getAllowUnixSockets() { return false; }
  static getAllowLocalBinding() { return false; }
  static getEnableWeakerNestedSandbox() { return false; }
  static getProxyPort() { return undefined; }
  static getSocksProxyPort() { return undefined; }
  static getLinuxHttpSocketPath() { return undefined; }
  static getLinuxSocksSocketPath() { return undefined; }
  static waitForNetworkInitialization() { return Promise.resolve(); }
  static getSandboxViolationStore() { return new SandboxViolationStore(); }
}

class SandboxViolationStore {
  constructor() {}
  getViolations() { return []; }
  clear() {}
  subscribe() { return () => {}; }
}

const SandboxRuntimeConfigSchema = z.object({}).passthrough().optional();

module.exports = {
  createSandbox: () => null,
  SandboxRuntimeConfigSchema,
  SandboxRuntime: class {},
  SandboxManager,
  SandboxViolationStore,
  normalizePathForSandbox: (p) => p,
};
