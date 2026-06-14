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
