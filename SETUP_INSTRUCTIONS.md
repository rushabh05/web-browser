# Setup Instructions

## Prerequisites

- Node.js 16+ (https://nodejs.org/)
- npm 7+ (comes with Node.js)

## Installation & Running

### 1. Clean Install

```bash
# Navigate to project
cd "/Users/rushabh.ye/Desktop/Backup Windows/rushabh.ye/Projects/web-browser"

# Remove old node_modules if they exist
rm -rf node_modules package-lock.json

# Install dependencies (this may take a few minutes)
npm install
```

### 2. Start Development

```bash
npm run dev
```

This will:
- Start the main Electron process
- Start the Webpack dev server on http://localhost:3000
- Open Electron window with DevTools

### 3. Try the Browser

Once running:
1. Type a URL in the address bar (e.g., `example.com`)
2. Press Enter or click "Go"
3. The page will load and render
4. Check the Console tab for logs
5. Inspect elements in the Inspector tab

## Common Commands

```bash
npm run dev          # Start development
npm run build        # Build for production
npm start            # Run production build
npm test             # Run tests
npm run lint         # Check code style
```

## Troubleshooting

### "No matching version found for electron-dev"

This is fixed! The package.json has been updated to remove the non-existent `electron-dev` package.

### "Cannot find module" errors

Make sure you've run `npm install` and all dependencies are installed.

### Port 3000 already in use

Either:
1. Change the port in webpack.config.js
2. Or kill the process using port 3000:
   ```bash
   lsof -ti :3000 | xargs kill -9
   ```

### Electron doesn't start

- Make sure Electron is installed: `npm install`
- Check that Node.js is version 16+: `node --version`
- Try clearing Electron cache: `rm -rf ~/.electron`

## Next Steps

Once everything is running:
1. Load a website (try example.com)
2. Explore the rendered output on canvas
3. Check console for logs
4. Inspect the DOM in the inspector
5. Try navigating back/forward
6. Reload the page

## Architecture

The browser has 3 layers:
- **Frontend**: React + Canvas rendering (Webpack dev server)
- **Main Process**: Electron + IPC handlers
- **Backend**: Node.js services (parsing, layout, etc.)

When you run `npm run dev`:
- Webpack dev server runs on port 3000
- Electron main process runs in development mode
- They communicate via IPC

Enjoy your web browser! 🚀
