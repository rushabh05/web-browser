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
