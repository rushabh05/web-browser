import { LayoutBox } from '../types';

export class RenderEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private onRedraw?: () => void;

  constructor(canvas: HTMLCanvasElement, onRedraw?: () => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.onRedraw = onRedraw;
  }

  render(layoutTree: LayoutBox): void {
    this.clearCanvas();
    this.paintBox(layoutTree);
  }

  setCanvasSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private paintBox(box: LayoutBox): void {
    const { x, y, width, height, backgroundColor, border, padding } = box;
    const tag = box.element?.tag?.toLowerCase();

    if (backgroundColor && backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.resolveColor(backgroundColor);
      this.ctx.fillRect(x, y, width, height);
    }

    if (border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0) {
      this.ctx.strokeStyle = '#cccccc';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
    }

    // Image rendering
    if (tag === 'img') {
      this.paintImage(box);
    }
    // Text rendering
    else if (box.element?.type === 'text' && box.element?.text?.trim()) {
      this.paintText(box);
    }

    for (const child of box.children) {
      this.paintBox(child);
    }
  }

  private paintImage(box: LayoutBox): void {
    const src = box.element?.attributes?.src;
    if (!src) {
      this.drawImagePlaceholder(box);
      return;
    }

    const cached = this.imageCache.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      this.ctx.drawImage(cached, box.x, box.y, box.width, box.height);
    } else if (!cached) {
      this.drawImagePlaceholder(box);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(src, img);
        this.onRedraw?.();
      };
      img.onerror = () => {
        // Keep the placeholder on error
        const errImg = new Image();
        this.imageCache.set(src, errImg);
      };
      img.src = src;
      this.imageCache.set(src, img);
    } else {
      this.drawImagePlaceholder(box);
    }
  }

  private drawImagePlaceholder(box: LayoutBox): void {
    const alt = box.element?.attributes?.alt || '';
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillRect(box.x, box.y, box.width, box.height);
    this.ctx.strokeStyle = '#aaaaaa';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    if (alt) {
      this.ctx.fillStyle = '#666666';
      this.ctx.font = '12px sans-serif';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(alt, box.x + 6, box.y + box.height / 2, box.width - 12);
    }
  }

  private paintText(box: LayoutBox): void {
    const { x, y, width, padding } = box;
    const fontSize = this.normalizeFontSize(box.fontSize);
    const weight = box.fontWeight === 'bold' ? 'bold' : 'normal';
    const color = this.resolveColor(box.color || '#000000');

    this.ctx.fillStyle = color;
    this.ctx.font = `${weight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    this.ctx.textBaseline = 'top';

    const textX = x + padding.left;
    const textY = y + padding.top;
    const maxWidth = Math.max(1, width - padding.left - padding.right);
    const lineHeight = Math.ceil(fontSize * 1.4);
    const text = box.element.text.trim().replace(/\s+/g, ' ');

    this.wrapText(text, textX, textY, maxWidth, lineHeight);
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    if (maxWidth <= 0) return;
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(testLine).width > maxWidth && line) {
        this.ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) this.ctx.fillText(line, x, currentY);
  }

  private normalizeFontSize(fontSize?: string | number): number {
    if (!fontSize) return 16;
    if (typeof fontSize === 'number') return fontSize;
    return parseInt(fontSize) || 16;
  }

  private resolveColor(color: string): string {
    if (!color) return '#000000';
    const colorMap: Record<string, string> = {
      red: '#ff0000', blue: '#0000ff', green: '#008000',
      black: '#000000', white: '#ffffff', gray: '#808080',
      grey: '#808080', navy: '#000080', teal: '#008080',
      orange: '#ffa500', purple: '#800080', yellow: '#ffff00',
      pink: '#ffc0cb', brown: '#a52a2a', lime: '#00ff00',
      silver: '#c0c0c0', gold: '#ffd700', cyan: '#00ffff',
      magenta: '#ff00ff', maroon: '#800000', olive: '#808000',
    };
    return colorMap[color.toLowerCase()] ?? color;
  }
}
