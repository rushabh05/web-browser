import { SandboxContext } from './SandboxContext.js';
import { StorageManager } from './StorageManager.js';

export class ScriptEngine {
  private storage: StorageManager;
  private sandboxes: Map<string, SandboxContext> = new Map();

  constructor() {
    this.storage = new StorageManager();
  }

  createSandbox(pageId: string, domReference: any): void {
    const sandbox = new SandboxContext(domReference, this.storage);
    this.sandboxes.set(pageId, sandbox);
  }

  executeScript(pageId: string, code: string): any {
    const sandbox = this.sandboxes.get(pageId);
    if (!sandbox) {
      throw new Error(`Sandbox for page ${pageId} not found`);
    }
    return sandbox.executeScript(code);
  }

  destroySandbox(pageId: string): void {
    this.sandboxes.delete(pageId);
  }

  getStorage(): StorageManager {
    return this.storage;
  }
}
