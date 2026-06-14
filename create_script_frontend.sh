#!/bin/bash

# Storage Manager
cat > src/backend/script/StorageManager.ts << 'EOFSTOR'
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface StorageData {
  cookies: Record<string, string>;
  localStorage: Record<string, string>;
}

export class StorageManager {
  private dataPath: string;
  private data: StorageData;

  constructor(appName: string = 'web-browser') {
    const userDataPath = app?.getPath?.('userData') || './data';
    this.dataPath = path.join(userDataPath, 'storage.json');
    this.data = this.loadData();
  }

  private loadData(): StorageData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load storage:', error);
    }

    return { cookies: {}, localStorage: {} };
  }

  private saveData(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save storage:', error);
    }
  }

  setCookie(key: string, value: string): void {
    this.data.cookies[key] = value;
    this.saveData();
  }

  getCookie(key: string): string | null {
    return this.data.cookies[key] ?? null;
  }

  getCookies(): Record<string, string> {
    return { ...this.data.cookies };
  }

  removeCookie(key: string): void {
    delete this.data.cookies[key];
    this.saveData();
  }

  clearCookies(): void {
    this.data.cookies = {};
    this.saveData();
  }

  setLocalStorage(key: string, value: string): void {
    this.data.localStorage[key] = value;
    this.saveData();
  }

  getLocalStorage(key: string): string | null {
    return this.data.localStorage[key] ?? null;
  }

  getAllLocalStorage(): Record<string, string> {
    return { ...this.data.localStorage };
  }

  removeLocalStorage(key: string): void {
    delete this.data.localStorage[key];
    this.saveData();
  }

  clearLocalStorage(): void {
    this.data.localStorage = {};
    this.saveData();
  }

  clear(): void {
    this.data = { cookies: {}, localStorage: {} };
    this.saveData();
  }
}
EOFSTOR

echo "✓ StorageManager created"

# Script Engine
cat > src/backend/script/ScriptEngine.ts << 'EOFSENG'
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
EOFSENG

echo "✓ ScriptEngine created"

# Sandbox Context
cat > src/backend/script/SandboxContext.ts << 'EOFSAND'
import { VM } from 'vm2';
import { StorageManager } from './StorageManager.js';

export class SandboxContext {
  private vm: VM;
  private storage: StorageManager;
  private domReference: any;

  constructor(domReference: any, storageManager: StorageManager) {
    this.domReference = domReference;
    this.storage = storageManager;

    const sandbox = {
      document: this.createDocumentProxy(),
      window: {},
      console: {
        log: (...args: any[]) => console.log('[SANDBOX]', ...args),
        error: (...args: any[]) => console.error('[SANDBOX]', ...args),
        warn: (...args: any[]) => console.warn('[SANDBOX]', ...args),
      },
      localStorage: this.createLocalStorageProxy(),
      fetch: this.createFetchProxy(),
      setTimeout: this.createSetTimeoutProxy(),
      setInterval: this.createSetIntervalProxy(),
    };

    sandbox.window = sandbox;

    this.vm = new VM({
      sandbox,
      timeout: 5000,
    });
  }

  executeScript(code: string): any {
    try {
      return this.vm.run(code);
    } catch (error) {
      console.error('Script execution error:', error);
      throw error;
    }
  }

  private createDocumentProxy(): any {
    return {
      getElementById: (id: string) => this.domReference.getElementById(id),
      getElementsByTagName: (tag: string) => this.domReference.getElementsByTagName(tag),
      getElementsByClassName: (className: string) => this.domReference.getElementsByClassName(className),
      querySelector: (selector: string) => this.domReference.querySelector(selector),
      querySelectorAll: (selector: string) => this.domReference.querySelectorAll(selector),
      addEventListener: (eventType: string, listener: any) =>
        this.domReference.addEventListener(eventType, listener),
      removeEventListener: (eventType: string, listener: any) =>
        this.domReference.removeEventListener(eventType, listener),
      createElement: (tag: string) => ({
        tag,
        attributes: {},
        children: [],
        appendChild: (child: any) => {},
        setAttribute: (name: string, value: string) => {},
        addEventListener: (eventType: string, listener: any) => {},
        textContent: '',
      }),
      createTextNode: (text: string) => ({
        type: 'text',
        text,
      }),
    };
  }

  private createLocalStorageProxy(): any {
    return {
      setItem: (key: string, value: string) => this.storage.setLocalStorage(key, value),
      getItem: (key: string) => this.storage.getLocalStorage(key),
      removeItem: (key: string) => this.storage.removeLocalStorage(key),
      clear: () => this.storage.clearLocalStorage(),
      key: (index: number) => {
        const keys = Object.keys(this.storage.getAllLocalStorage());
        return keys[index] ?? null;
      },
      get length() {
        return Object.keys(this.storage.getAllLocalStorage()).length;
      },
    };
  }

  private createFetchProxy(): (url: string, options?: any) => Promise<any> {
    return async (url: string, options?: any) => {
      const method = options?.method || 'GET';
      const headers = options?.headers || {};
      const body = options?.body;

      console.log(`[SANDBOX] Fetch blocked: ${method} ${url}`);

      return {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({}),
        text: async () => '',
      };
    };
  }

  private createSetTimeoutProxy(): (callback: any, delay?: number) => number {
    let timerId = 0;
    return (callback: any, delay?: number) => {
      setTimeout(() => {
        try {
          if (typeof callback === 'function') {
            callback();
          }
        } catch (error) {
          console.error('Timeout callback error:', error);
        }
      }, delay || 0);
      return ++timerId;
    };
  }

  private createSetIntervalProxy(): (callback: any, delay?: number) => number {
    let timerId = 0;
    return (callback: any, delay?: number) => {
      setInterval(() => {
        try {
          if (typeof callback === 'function') {
            callback();
          }
        } catch (error) {
          console.error('Interval callback error:', error);
        }
      }, delay || 1000);
      return ++timerId;
    };
  }
}
EOFSAND

echo "✓ SandboxContext created"
echo "Done with backend modules!"
