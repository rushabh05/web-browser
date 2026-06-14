export interface LayoutBox {
  element: any;
  x: number;
  y: number;
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  margin: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  display: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string | number;
  fontWeight?: string;
  textAlign?: string;
  children: LayoutBox[];
}

export class LayoutEngine {
  private blockElements = new Set([
    'div', 'p', 'section', 'article', 'header', 'footer', 'main',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
    'form', 'table', 'tr', 'thead', 'tbody', 'blockquote', 'pre', 'hr',
  ]);

  private defaultFontSizes: Record<string, number> = {
    h1: 32, h2: 28, h3: 24, h4: 20, h5: 16, h6: 14,
    p: 16, span: 16, a: 16, button: 14, li: 16,
  };

  layout(dom: any, styles: any[], viewportWidth: number, viewportHeight: number): LayoutBox {
    const rootBox: LayoutBox = {
      element: dom,
      x: 0, y: 0,
      width: viewportWidth,
      height: viewportHeight,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      border: { top: 0, right: 0, bottom: 0, left: 0 },
      display: 'block',
      children: [],
    };

    let currentY = rootBox.y + rootBox.padding.top;
    for (const child of dom.children || []) {
      currentY = this.layoutNode(child, styles, rootBox, viewportWidth - 16, currentY);
    }

    rootBox.height = Math.max(viewportHeight, currentY - rootBox.y + rootBox.padding.bottom);
    return rootBox;
  }

  /**
   * Lays out a single element and all its descendants.
   * Returns the Y coordinate where the next sibling should start.
   */
  private layoutNode(
    element: any,
    styles: any[],
    parentBox: LayoutBox,
    availableWidth: number,
    startY: number,
  ): number {
    if (element.type === 'text') {
      const text = (element.text || '').trim();
      if (!text) return startY;

      const box: LayoutBox = {
        element,
        x: parentBox.x + parentBox.padding.left,
        y: startY,
        width: availableWidth,
        height: 20,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        border: { top: 0, right: 0, bottom: 0, left: 0 },
        display: 'inline',
        children: [],
      };
      parentBox.children.push(box);
      return startY + box.height;
    }

    if (element.type !== 'element') return startY;

    const tag = (element.tag || '').toLowerCase();
    if (['script', 'style', 'head', 'meta', 'link', 'title'].includes(tag)) return startY;

    // Images are block-like, reserve their space
    if (tag === 'img') {
      const attrW = parseInt(element.attributes?.width || '0');
      const attrH = parseInt(element.attributes?.height || '0');
      const imgW = attrW > 0 ? Math.min(attrW, availableWidth) : Math.min(300, availableWidth);
      const imgH = attrH > 0 ? attrH : (attrW > 0 ? Math.round(attrW * 0.6) : 180);
      const box: LayoutBox = {
        element,
        x: parentBox.x + parentBox.padding.left,
        y: startY,
        width: imgW,
        height: imgH,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 4, right: 4, bottom: 4, left: 0 },
        border: { top: 0, right: 0, bottom: 0, left: 0 },
        display: 'block',
        children: [],
      };
      parentBox.children.push(box);
      return startY + imgH + 8;
    }

    const computedStyle = this.getComputedStyle(element, styles);
    const isBlock = computedStyle.display
      ? computedStyle.display !== 'inline'
      : this.blockElements.has(tag);

    const box: LayoutBox = {
      element,
      x: parentBox.x + parentBox.padding.left,
      y: startY,
      width: 0, height: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      border: { top: 0, right: 0, bottom: 0, left: 0 },
      display: isBlock ? 'block' : 'inline',
      backgroundColor: computedStyle['background-color'] || computedStyle['backgroundColor'] || 'transparent',
      color: computedStyle.color || '#000000',
      fontSize: computedStyle['font-size'] || `${this.defaultFontSizes[tag] || 16}px`,
      fontWeight: computedStyle['font-weight'] || (tag.match(/^h[1-6]$/) ? 'bold' : 'normal'),
      textAlign: computedStyle['text-align'] || 'left',
      children: [],
    };

    this.applyBoxModel(box, computedStyle);

    box.x = parentBox.x + parentBox.padding.left + box.margin.left;
    box.y = startY + box.margin.top;
    box.width = availableWidth - box.margin.left - box.margin.right;

    // Layout children recursively, tracking vertical cursor
    let childY = box.y + box.padding.top;
    for (const child of element.children || []) {
      childY = this.layoutNode(child, styles, box, box.width - box.padding.left - box.padding.right, childY);
    }

    box.height = Math.max(
      box.padding.top + box.padding.bottom + 4,
      childY - box.y + box.padding.bottom,
    );

    parentBox.children.push(box);

    return box.y + box.height + box.margin.bottom;
  }

  private applyBoxModel(box: LayoutBox, style: Record<string, string>): void {
    const px = (v: string | undefined): number => (v ? parseInt(v) || 0 : 0);
    const shorthand = (prop: string) => style[prop] ? px(style[prop]) : 0;

    box.margin = {
      top:    px(style['margin-top'])    || shorthand('margin'),
      right:  px(style['margin-right'])  || shorthand('margin'),
      bottom: px(style['margin-bottom']) || shorthand('margin'),
      left:   px(style['margin-left'])   || shorthand('margin'),
    };

    box.padding = {
      top:    px(style['padding-top'])    || shorthand('padding'),
      right:  px(style['padding-right'])  || shorthand('padding'),
      bottom: px(style['padding-bottom']) || shorthand('padding'),
      left:   px(style['padding-left'])   || shorthand('padding'),
    };

    box.border = {
      top:    px(style['border-top-width'])    || (style['border'] ? 1 : 0),
      right:  px(style['border-right-width'])  || (style['border'] ? 1 : 0),
      bottom: px(style['border-bottom-width']) || (style['border'] ? 1 : 0),
      left:   px(style['border-left-width'])   || (style['border'] ? 1 : 0),
    };
  }

  private getComputedStyle(element: any, styles: any[]): Record<string, string> {
    const computed: Record<string, string> = {};
    if (!Array.isArray(styles)) return computed;

    for (const rule of styles) {
      if (this.selectorMatches(rule.selector, element)) {
        Object.assign(computed, rule.declarations);
      }
    }
    return computed;
  }

  private selectorMatches(selector: string, element: any): boolean {
    if (!selector || !element) return false;
    if (selector === '*') return true;
    if (selector === element.tag) return true;
    if (selector.startsWith('.')) {
      return (element.attributes?.class || '').split(/\s+/).includes(selector.slice(1));
    }
    if (selector.startsWith('#')) {
      return element.attributes?.id === selector.slice(1);
    }
    return false;
  }

  private isBlockElement(tag?: string): boolean {
    return this.blockElements.has(tag?.toLowerCase() || '');
  }
}
