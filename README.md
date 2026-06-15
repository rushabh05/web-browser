# 🔥 Flare

A fast, ad-blocking desktop browser built with Electron, React, and TypeScript.

## Download

**[⬇ Download Flare for macOS → GitHub Releases](https://github.com/rushabh05/web-browser/releases)**

| Platform | File |
|---|---|
| Apple Silicon (M1/M2/M3/M4) | `Flare-0.1.0-arm64.dmg` |
| Intel Mac | `Flare-0.1.0.dmg` |

### Install
1. Download the `.dmg` for your Mac
2. Open it and drag **Flare** to Applications
3. First launch fix (unsigned app — run once in Terminal):
   ```bash
   xattr -cr /Applications/Flare.app
   ```

---

## Features

- **Ad blocking** — blocks major ad networks; auto-skips and hides YouTube ads
- **Multi-tab browsing** — open, close, and switch tabs
- **Chrome-like UI** — address bar, back/forward/reload, favicons, loading indicators
- **Keyboard shortcuts**

  | Shortcut | Action |
  |---|---|
  | `Cmd+T` | New tab |
  | `Cmd+W` | Close tab |
  | `Cmd+R` | Reload |
  | `Cmd+L` | Focus address bar |
  | `Cmd+Shift+I` | Developer tools |
  | `Cmd+Shift+U` | Browser UI DevTools |

- **Right-click context menu** — back, forward, reload, open link in new tab, inspect, and more
- **Flare branding** — custom identity throughout the UI

---

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
git clone https://github.com/rushabh05/web-browser.git
cd web-browser
npm install
```

### Run in dev mode
```bash
npm run dev
```

### Build production app
```bash
npm run dist:mac      # macOS DMG (arm64 + x64)
npm run dist:win      # Windows installer
npm run dist:linux    # Linux AppImage + deb
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 27 |
| UI | React 18 + styled-components |
| Language | TypeScript |
| Bundler | Webpack 5 |
| Packaging | electron-builder |

---

## License

MIT
