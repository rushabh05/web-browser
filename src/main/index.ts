import { app, BrowserWindow, BrowserView, ipcMain, session, Menu, MenuItem, clipboard, shell } from 'electron';
import path from 'path';
import { ErrorHandler }        from '../backend/utils/ErrorHandler';
import { performanceMonitor }  from '../backend/utils/PerformanceMonitor';
import { HttpClient }          from '../backend/network/HttpClient';
import { HtmlParser }          from '../backend/parser/HtmlParser';
import { CssParser }           from '../backend/layout/CssParser';
import { LayoutEngine }        from '../backend/layout/LayoutEngine';

const CHROME_UA     = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const HEADER_HEIGHT = 92;   // tab bar (36) + nav bar (56)
const isDev         = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

// ─── Ad / tracker block-list ─────────────────────────────────────────────────
// RULE: Only block domains whose SOLE purpose is serving ads or injecting
// third-party ad scripts. Never block analytics/error-reporting/CDN domains
// that legitimate sites (Spotify, GitHub, etc.) depend on for core functionality.
const AD_HOSTS = new Set([
  // Pure display ad networks
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'googletagservices.com',       // ad tag container (distinct from googletagmanager)
  'amazon-adsystem.com',
  'media.net',
  'outbrain.com',
  'taboola.com',
  'criteo.com',
  'criteo.net',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'contextweb.com',
  'casalemedia.com',
  'adnxs.com',                   // AppNexus
  'adsafeprotected.com',
  'moatads.com',
  'adsrvr.org',
  'bidswitch.net',
  'spotxchange.com',
  'smartadserver.com',
  'lijit.com',
  'zedo.com',
  'advertising.com',
  'adform.net',
  'adtech.com',
  'yieldmo.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'trafficjunky.net',
  'juicyads.com',
  'mgid.com',
  'revcontent.com',
  'sharethrough.com',
  'teads.tv',
  'triplelift.com',
  'undertone.com',
  // YouTube-specific ad infrastructure (safe — doesn't affect video/audio playback)
  'imasdk.googleapis.com',         // Google IMA SDK (video ad loader)
  'googleads.g.doubleclick.net',   // YouTube pre-roll targeting
  'static.doubleclick.net',
  'ad.doubleclick.net',
  'pagead2.googlesyndication.com',
  // Pure tracker pixels (no functional role for any site)
  'quantserve.com',
  'scorecardresearch.com',
  'comscore.com',
  'chartbeat.com',
  'chartbeat.net',
]);

// ─── YouTube ad-skip script ───────────────────────────────────────────────────
// Injected on dom-ready for youtube.com pages.
// Skips pre-roll/mid-roll ads and hides overlay ads.
const YOUTUBE_AD_SCRIPT = `
(function() {
  'use strict';
  let skipInterval = null;

  function skipAds() {
    // Click "Skip Ad" / "Skip Ads" button
    const skipBtn = document.querySelector(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button'
    );
    if (skipBtn) { skipBtn.click(); return; }

    // If pre-roll ad is playing, jump to the end of it
    const video = document.querySelector('video');
    const adBadge = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
    if (video && adBadge && !video.paused && isFinite(video.duration)) {
      video.currentTime = video.duration;
      video.muted = false;
      return;
    }

    // Hide overlay / banner ads
    const selectors = [
      '.ytp-ad-overlay-container',
      '.ytp-ad-text-overlay',
      '.ytd-banner-promo-renderer',
      '#masthead-ad',
      'ytd-display-ad-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-ad-slot-renderer',
      '.ytd-promoted-video-renderer',
      '#player-ads',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    });
  }

  // Run immediately and every 300ms
  skipAds();
  if (skipInterval) clearInterval(skipInterval);
  skipInterval = setInterval(skipAds, 300);

  // Also run on navigation within YouTube (SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      skipAds();
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
`;

function isAdUrl(urlString: string): boolean {
  try {
    const host = new URL(urlString).hostname.replace(/^www\./, '');
    return [...AD_HOSTS].some(ad => host === ad || host.endsWith('.' + ad));
  } catch { return false; }
}

// ─── Tab management ───────────────────────────────────────────────────────────
interface TabEntry { id: string; view: BrowserView; }
const tabs  = new Map<string, TabEntry>();
let activeId: string | null = null;
let tabSeq  = 0;

function viewBounds(): Electron.Rectangle {
  const b = mainWindow?.getContentBounds() ?? { x:0, y:0, width:1400, height:900 };
  return { x: 0, y: HEADER_HEIGHT, width: b.width, height: Math.max(0, b.height - HEADER_HEIGHT) };
}

function makeView(url: string): TabEntry {
  const id   = `tab-${++tabSeq}`;
  const view = new BrowserView({
    webPreferences: { nodeIntegration: false, contextIsolation: true, devTools: true },
  });
  view.webContents.setUserAgent(CHROME_UA);
  view.webContents.on('will-navigate', () => {});
  view.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));

  const send = (ch: string, ...a: any[]) => mainWindow?.webContents.send(ch, id, ...a);
  const wc   = view.webContents;

  wc.on('did-navigate',         (_, u) => send('bv-navigate',  u));
  wc.on('did-navigate-in-page', (_, u) => send('bv-navigate',  u));
  wc.on('did-start-loading',    ()     => send('bv-loading',   true));
  wc.on('did-stop-loading',     ()     => { send('bv-loading', false); send('bv-can-nav', wc.canGoBack(), wc.canGoForward()); });
  wc.on('page-title-updated',   (_, t) => send('bv-title',     t));
  wc.on('page-favicon-updated', (_, f) => send('bv-favicon',   f[0] ?? ''));

  // ── YouTube ad injection ────────────────────────────────────────────────────
  wc.on('dom-ready', () => {
    const url = wc.getURL();
    if (url.includes('youtube.com')) {
      wc.executeJavaScript(YOUTUBE_AD_SCRIPT).catch(() => {});
    }
  });

  // ── Keyboard shortcuts inside the page ──────────────────────────────────────
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    if (ctrl && input.key === 't')                      { event.preventDefault(); ipcMain.emit('shortcut-new-tab', {}); }
    if (ctrl && input.key === 'w')                      { event.preventDefault(); ipcMain.emit('shortcut-close-tab', {}, id); }
    if (ctrl && input.key === 'r')                      { event.preventDefault(); wc.reload(); }
    if (ctrl && input.shift && input.key === 'R')       { event.preventDefault(); wc.reloadIgnoringCache(); }
    if (ctrl && input.key === 'l')                      { event.preventDefault(); mainWindow?.webContents.send('focus-address-bar'); }
    if (input.key === 'F5')                             { wc.reload(); }
    if (ctrl && input.key === '=')                      { wc.setZoomLevel(wc.getZoomLevel() + 0.5); }
    if (ctrl && input.key === '-')                      { wc.setZoomLevel(wc.getZoomLevel() - 0.5); }
    if (ctrl && input.key === '0')                      { wc.setZoomLevel(0); }
    if (ctrl && input.shift && input.key === 'I')       { wc.openDevTools(); }
    if (ctrl && input.shift && input.key === 'J')       { wc.openDevTools({ mode: 'detach' }); }
    if (input.key === 'F12')                            { wc.openDevTools(); }
    if (ctrl && input.key === 'ArrowLeft'  || (input.alt && input.key === 'ArrowLeft'))  { if (wc.canGoBack())    wc.goBack(); }
    if (ctrl && input.key === 'ArrowRight' || (input.alt && input.key === 'ArrowRight')) { if (wc.canGoForward()) wc.goForward(); }
  });

  // ── Right-click context menu ────────────────────────────────────────────────
  wc.on('context-menu', (_event, params) => {
    const items: Electron.MenuItemConstructorOptions[] = [];

    // Navigation
    items.push(
      { label: 'Back',    enabled: wc.canGoBack(),    click: () => wc.goBack() },
      { label: 'Forward', enabled: wc.canGoForward(), click: () => wc.goForward() },
      { label: 'Reload',  click: () => wc.reload() },
      { type: 'separator' },
    );

    // Link actions
    if (params.linkURL) {
      items.push(
        { label: 'Open Link in New Tab',   click: () => ipcMain.emit('shortcut-open-url', {}, params.linkURL) },
        { label: 'Open Link in New Window',click: () => shell.openExternal(params.linkURL) },
        { label: 'Copy Link Address',       click: () => clipboard.writeText(params.linkURL) },
        { type: 'separator' },
      );
    }

    // Image actions
    if (params.mediaType === 'image' && params.srcURL) {
      items.push(
        { label: 'Open Image in New Tab', click: () => ipcMain.emit('shortcut-open-url', params.srcURL) },
        { label: 'Copy Image Address',    click: () => clipboard.writeText(params.srcURL) },
        { type: 'separator' },
      );
    }

    // Text actions
    if (params.selectionText) {
      items.push(
        { label: 'Copy',   role: 'copy'      as any },
        { label: 'Search Google for "%SELECTION%"'.replace('%SELECTION%', params.selectionText.slice(0, 30)),
          click: () => ipcMain.emit('shortcut-open-url', {}, `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`) },
        { type: 'separator' },
      );
    }

    if (params.isEditable) {
      items.push(
        { label: 'Cut',       role: 'cut'       as any },
        { label: 'Copy',      role: 'copy'      as any },
        { label: 'Paste',     role: 'paste'     as any },
        { label: 'Select All',role: 'selectAll' as any },
        { type: 'separator' },
      );
    }

    // Page actions
    items.push(
      { label: 'Save Page As…', click: () => wc.downloadURL(wc.getURL()) },
      { label: 'Print…',        click: () => wc.print() },
      { type: 'separator' },
      { label: 'View Page Source', click: () => ipcMain.emit('shortcut-open-url', {}, `view-source:${wc.getURL()}`) },
      { label: 'Inspect',          click: () => { wc.openDevTools(); } },
    );

    Menu.buildFromTemplate(items).popup({ window: mainWindow! });
  });

  tabs.set(id, { id, view });
  view.webContents.loadURL(url).catch(() => {});
  return { id, view };
}

function showTab(id: string) {
  if (!mainWindow) return;
  const entry = tabs.get(id);
  if (!entry) return;
  for (const [tid, te] of tabs) {
    if (tid === id) { mainWindow.addBrowserView(te.view); te.view.setBounds(viewBounds()); }
    else            { mainWindow.removeBrowserView(te.view); }
  }
  activeId = id;
}

// ─── Application menu ─────────────────────────────────────────────────────────
function buildMenu() {
  const getActive = () => activeId ? tabs.get(activeId)?.view.webContents : null;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Tab',    accelerator: 'CmdOrCtrl+T', click: () => ipcMain.emit('shortcut-new-tab', {}) },
        { label: 'Close Tab',  accelerator: 'CmdOrCtrl+W', click: () => { if (activeId) ipcMain.emit('shortcut-close-tab', {}, activeId); } },
        { type: 'separator' },
        { label: 'Print…',     accelerator: 'CmdOrCtrl+P', click: () => getActive()?.print() },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find in Page…', accelerator: 'CmdOrCtrl+F', click: () => getActive()?.findInPage('') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload',       accelerator: 'CmdOrCtrl+R',       click: () => getActive()?.reload() },
        { label: 'Hard Reload',  accelerator: 'CmdOrCtrl+Shift+R', click: () => getActive()?.reloadIgnoringCache() },
        { label: 'Stop',         accelerator: 'Escape',             click: () => getActive()?.stop() },
        { type: 'separator' },
        { label: 'Zoom In',      accelerator: 'CmdOrCtrl+=',        click: () => { const wc = getActive(); if (wc) wc.setZoomLevel(wc.getZoomLevel() + 0.5); } },
        { label: 'Zoom Out',     accelerator: 'CmdOrCtrl+-',        click: () => { const wc = getActive(); if (wc) wc.setZoomLevel(wc.getZoomLevel() - 0.5); } },
        { label: 'Reset Zoom',   accelerator: 'CmdOrCtrl+0',        click: () => getActive()?.setZoomLevel(0) },
        { type: 'separator' },
        { label: 'Focus Address Bar', accelerator: 'CmdOrCtrl+L', click: () => mainWindow?.webContents.send('focus-address-bar') },
        { type: 'separator' },
        { label: 'Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => getActive()?.openDevTools() },
        { label: 'JavaScript Console', accelerator: 'CmdOrCtrl+Shift+J', click: () => getActive()?.openDevTools({ mode: 'detach' }) },
        { label: 'Shell DevTools (UI)', accelerator: 'CmdOrCtrl+Shift+U', click: () => mainWindow?.webContents.openDevTools() },
      ],
    },
    {
      label: 'History',
      submenu: [
        { label: 'Back',    accelerator: 'Alt+Left',  click: () => { const wc = getActive(); if (wc?.canGoBack())    wc.goBack(); } },
        { label: 'Forward', accelerator: 'Alt+Right', click: () => { const wc = getActive(); if (wc?.canGoForward()) wc.goForward(); } },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 600, minHeight: 400,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('resize', () => {
    if (!mainWindow || !activeId) return;
    tabs.get(activeId)?.view.setBounds(viewBounds());
  });
  mainWindow.on('closed', () => {
    tabs.forEach(({ view }) => { try { (view as any).destroy?.(); } catch {} });
    tabs.clear(); mainWindow = null;
  });

  if (isDev) {
    // Dev: load from webpack-dev-server with retry until server is ready
    const devUrl = 'http://localhost:3000';
    const tryLoad = (n = 0) =>
      mainWindow?.loadURL(devUrl).catch(() => { if (n < 20) setTimeout(() => tryLoad(n + 1), 500); });
    tryLoad();
  } else {
    // Production: asar=false so __dirname is a real filesystem path
    const rendererPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
    console.log('[main] loading renderer from:', rendererPath);
    mainWindow.loadFile(rendererPath)
      .then(() => console.log('[main] renderer loaded OK'))
      .catch(err => {
        console.error('[main] loadFile failed:', err);
        mainWindow?.loadURL(`file://${rendererPath}`);
      });
  }
}

// ─── internal shortcut events ─────────────────────────────────────────────────
ipcMain.on('shortcut-new-tab', () => {
  const entry = makeView('https://www.google.com');
  showTab(entry.id);
  mainWindow?.webContents.send('bv-new-tab-created', entry.id, 'https://www.google.com');
  mainWindow?.webContents.send('focus-address-bar');
});

ipcMain.on('shortcut-close-tab', (_event, id: string) => {
  const entry = tabs.get(id);
  if (!entry) return;
  mainWindow?.removeBrowserView(entry.view);
  try { (entry.view as any).destroy?.(); } catch {}
  tabs.delete(id);
  const remaining = [...tabs.keys()];
  if (remaining.length === 0) { app.quit(); return; }
  const nextId = remaining[remaining.length - 1];
  showTab(nextId);
  mainWindow?.webContents.send('bv-tab-closed', id, nextId);
});

ipcMain.on('shortcut-open-url', (_event, url: string) => {
  const entry = makeView(url);
  showTab(entry.id);
  mainWindow?.webContents.send('bv-new-tab-created', entry.id, url);
});

// ─── IPC — tab lifecycle ──────────────────────────────────────────────────────
ipcMain.handle('bv-new-tab', (_, url: string = 'https://www.google.com') => {
  const entry = makeView(url);
  showTab(entry.id);
  return entry.id;
});

ipcMain.handle('bv-close-tab', (_, id: string) => {
  const entry = tabs.get(id);
  if (!entry) return null;
  mainWindow?.removeBrowserView(entry.view);
  try { (entry.view as any).destroy?.(); } catch {}
  tabs.delete(id);
  const remaining = [...tabs.keys()];
  if (remaining.length === 0) { app.quit(); return null; }
  const nextId = remaining[remaining.length - 1];
  showTab(nextId);
  return nextId;
});

ipcMain.handle('bv-switch-tab', (_, id: string) => showTab(id));
ipcMain.handle('bv-navigate-to', (_, id: string, url: string) => tabs.get(id)?.view.webContents.loadURL(url).catch(() => {}));
ipcMain.handle('bv-go-back',    (_, id: string) => { const wc = tabs.get(id)?.view.webContents; if (wc?.canGoBack())    wc.goBack(); });
ipcMain.handle('bv-go-forward', (_, id: string) => { const wc = tabs.get(id)?.view.webContents; if (wc?.canGoForward()) wc.goForward(); });
ipcMain.handle('bv-reload',     (_, id: string) => tabs.get(id)?.view.webContents.reload());
ipcMain.handle('bv-stop',       (_, id: string) => tabs.get(id)?.view.webContents.stop());

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', () => {});
  contents.setWindowOpenHandler(() => ({ action: 'allow' }));
});

app.on('ready', async () => {
  session.defaultSession.setUserAgent(CHROME_UA);

  // ── Ad blocking ────────────────────────────────────────────────────────────
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: isAdUrl(details.url) });
  });

  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });

// ─── Legacy engine IPC ────────────────────────────────────────────────────────
const httpClient   = new HttpClient();
const htmlParser   = new HtmlParser();
const cssParser    = new CssParser();
const layoutEngine = new LayoutEngine();

ipcMain.handle('fetch-url',  async (_, url) => {
  try   { return { success: true, html: await performanceMonitor.measureAsync('fetch-url', () => httpClient.fetchUrl(url)) }; }
  catch (e) { ErrorHandler.logError(e, 'fetch-url'); return { success: false, error: ErrorHandler.handleError(e) }; }
});
ipcMain.handle('parse-html', (_, html) => {
  try   { return { success: true, dom:        performanceMonitor.measure('parse-html', () => htmlParser.parse(html)) }; }
  catch (e) { return { success: false, error: ErrorHandler.handleError(e) }; }
});
ipcMain.handle('parse-css',  (_, css) => {
  try   { return { success: true, rules:      performanceMonitor.measure('parse-css', () => cssParser.parse(css)) }; }
  catch (e) { return { success: false, error: ErrorHandler.handleError(e) }; }
});
ipcMain.handle('layout', (_, dom, styles, w, h) => {
  try   { return { success: true, layoutTree: performanceMonitor.measure('layout', () => layoutEngine.layout(dom, styles, w, h)) }; }
  catch (e) { return { success: false, error: ErrorHandler.handleError(e) }; }
});
