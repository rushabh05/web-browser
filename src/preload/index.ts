import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('browserNav', {
  // Tab lifecycle
  newTab:    (url?: string)           => ipcRenderer.invoke('bv-new-tab',      url),
  closeTab:  (id: string)             => ipcRenderer.invoke('bv-close-tab',    id),
  switchTab: (id: string)             => ipcRenderer.invoke('bv-switch-tab',   id),

  // Navigation (all scoped to a tab id)
  navigateTo: (id: string, url: string) => ipcRenderer.invoke('bv-navigate-to', id, url),
  goBack:     (id: string)              => ipcRenderer.invoke('bv-go-back',      id),
  goForward:  (id: string)              => ipcRenderer.invoke('bv-go-forward',   id),
  reload:     (id: string)              => ipcRenderer.invoke('bv-reload',        id),
  stop:       (id: string)              => ipcRenderer.invoke('bv-stop',          id),

  // Events — all carry tabId as first payload arg
  onNavigate: (cb: (tabId: string, url: string) => void) =>
    ipcRenderer.on('bv-navigate', (_, tabId, url) => cb(tabId, url)),
  onLoading:  (cb: (tabId: string, loading: boolean) => void) =>
    ipcRenderer.on('bv-loading',  (_, tabId, loading) => cb(tabId, loading)),
  onTitle:    (cb: (tabId: string, title: string) => void) =>
    ipcRenderer.on('bv-title',    (_, tabId, title) => cb(tabId, title)),
  onFavicon:  (cb: (tabId: string, url: string) => void) =>
    ipcRenderer.on('bv-favicon',  (_, tabId, url) => cb(tabId, url)),
  onCanNav:   (cb: (tabId: string, back: boolean, fwd: boolean) => void) =>
    ipcRenderer.on('bv-can-nav',  (_, tabId, back, fwd) => cb(tabId, back, fwd)),

  removeAllListeners: () =>
    ['bv-navigate','bv-loading','bv-title','bv-favicon','bv-can-nav',
     'bv-new-tab-created','bv-tab-closed','focus-address-bar']
      .forEach(ch => ipcRenderer.removeAllListeners(ch)),

  // Shortcut events from main process
  onNewTabCreated: (cb: (tabId: string, url: string) => void) =>
    ipcRenderer.on('bv-new-tab-created', (_, tabId, url) => cb(tabId, url)),
  onTabClosed: (cb: (closedId: string, nextId: string) => void) =>
    ipcRenderer.on('bv-tab-closed', (_, closedId, nextId) => cb(closedId, nextId)),
  onFocusAddressBar: (cb: () => void) =>
    ipcRenderer.on('focus-address-bar', () => cb()),
});

// Keep legacy API for any remaining references
contextBridge.exposeInMainWorld('browserAPI', {
  fetchUrl:  (url: string)  => ipcRenderer.invoke('fetch-url',  url),
  parseHtml: (html: string) => ipcRenderer.invoke('parse-html', html),
  parseCss:  (css: string)  => ipcRenderer.invoke('parse-css',  css),
  layout: (dom: any, styles: any, w: number, h: number) =>
    ipcRenderer.invoke('layout', dom, styles, w, h),
  onDomUpdate: (cb: (d: any) => void) =>
    ipcRenderer.on('dom-update', (_, d) => cb(d)),
});

declare global {
  interface Window {
    browserNav: {
      newTab:    (url?: string)              => Promise<string>;
      closeTab:  (id: string)                => Promise<string | null>;
      switchTab: (id: string)                => Promise<void>;
      navigateTo:(id: string, url: string)   => Promise<void>;
      goBack:    (id: string)                => Promise<void>;
      goForward: (id: string)                => Promise<void>;
      reload:    (id: string)                => Promise<void>;
      stop:      (id: string)                => Promise<void>;
      onNavigate:(cb: (tabId: string, url: string) => void)                    => void;
      onLoading: (cb: (tabId: string, loading: boolean) => void)               => void;
      onTitle:   (cb: (tabId: string, title: string) => void)                  => void;
      onFavicon: (cb: (tabId: string, url: string) => void)                    => void;
      onCanNav:  (cb: (tabId: string, back: boolean, fwd: boolean) => void)    => void;
      removeAllListeners: () => void;
      onNewTabCreated: (cb: (tabId: string, url: string) => void) => void;
      onTabClosed: (cb: (closedId: string, nextId: string) => void) => void;
      onFocusAddressBar: (cb: () => void) => void;
    };
    browserAPI: {
      fetchUrl:  (url: string) => Promise<any>;
      parseHtml: (html: string) => Promise<any>;
      parseCss:  (css: string) => Promise<any>;
      layout:    (dom: any, styles: any, w: number, h: number) => Promise<any>;
      onDomUpdate: (cb: (d: any) => void) => void;
    };
  }
}
