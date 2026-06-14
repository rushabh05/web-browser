#!/bin/bash

# Render Engine
cat > src/frontend/renderer/RenderEngine.ts << 'EOFENG'
import { LayoutBox } from '../backend/layout/LayoutEngine.js';

export class RenderEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paintDirty = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  render(layoutTree: LayoutBox): void {
    if (!this.paintDirty) return;

    this.clearCanvas();
    this.paintBox(layoutTree);
    this.paintDirty = false;
  }

  markDirty(): void {
    this.paintDirty = true;
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private paintBox(box: LayoutBox): void {
    const { x, y, width, height, backgroundColor, border, padding } = box;

    if (backgroundColor && backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.parseColor(backgroundColor);
      this.ctx.fillRect(x, y, width, height);
    }

    if (border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0) {
      this.ctx.strokeStyle = '#cccccc';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
    }

    if (box.element?.type === 'text' && box.element?.text) {
      this.ctx.fillStyle = box.color || '#000000';
      this.ctx.font = `${box.fontWeight === 'bold' ? 'bold' : ''} ${box.fontSize} -apple-system, sans-serif`;
      this.ctx.fillText(box.element.text, x + padding.left, y + padding.top + 14);
    }

    for (const child of box.children) {
      this.paintBox(child);
    }
  }

  private parseColor(color: string): string {
    const colorMap: Record<string, string> = {
      'red': '#ff0000', 'blue': '#0000ff', 'green': '#00ff00',
      'black': '#000000', 'white': '#ffffff',
      'gray': '#808080', 'grey': '#808080',
    };

    return colorMap[color.toLowerCase()] || color;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.markDirty();
  }
}
EOFENG

echo "✓ RenderEngine created"

# CSS for styles
cat > src/frontend/styles/main.css << 'EOFCSS'
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  width: 100%;
  height: 100%;
}

button {
  font-family: inherit;
}

input {
  font-family: inherit;
}

input:focus-visible {
  outline: none;
}
EOFCSS

echo "✓ Styles created"

# React entry point
cat > src/frontend/index.tsx << 'EOFIDX'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './styles/main.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOFIDX

echo "✓ Frontend index created"
