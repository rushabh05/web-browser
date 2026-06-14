#!/bin/bash

echo "Creating all remaining source files..."

# Layout Engine
cat > src/backend/layout/LayoutEngine.ts << 'EOFLAYOUT'
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
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
  children: LayoutBox[];
}

export class LayoutEngine {
  private blockElements = new Set(['div', 'p', 'section', 'article', 'header', 'footer', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'form', 'table']);
  private fontSizeMap: Record<string, number> = {
    'h1': 32, 'h2': 28, 'h3': 24, 'h4': 20, 'h5': 16, 'h6': 14,
    'p': 16, 'span': 16, 'a': 16, 'button': 14,
  };

  layout(dom: any, styles: any, viewportWidth: number, viewportHeight: number): LayoutBox {
    const rootBox = this.createLayoutBox(dom);
    rootBox.width = viewportWidth;
    rootBox.height = viewportHeight;
    this.layoutNode(dom, styles, rootBox, viewportWidth);
    return rootBox;
  }

  private layoutNode(element: any, styles: any, parentBox: LayoutBox, availableWidth: number): void {
    if (element.type === 'text') {
      this.layoutText(element, parentBox, availableWidth);
      return;
    }

    if (element.type !== 'element') return;

    const box = this.createLayoutBox(element);
    const computedStyle = this.getComputedStyle(element, styles);

    Object.assign(box, {
      display: computedStyle.display || (this.isBlockElement(element.tag) ? 'block' : 'inline'),
      backgroundColor: computedStyle['background-color'] || 'transparent',
      color: computedStyle.color || '#000000',
      fontSize: computedStyle['font-size'] || this.fontSizeMap[element.tag] || '16px',
      fontWeight: computedStyle['font-weight'] || 'normal',
      textAlign: computedStyle['text-align'] || 'left',
    });

    this.applyBoxModel(box, computedStyle, availableWidth);

    let currentY = parentBox.y + parentBox.padding.top;
    let currentX = parentBox.x + parentBox.padding.left;

    if (box.display === 'block') {
      box.x = currentX;
      box.y = currentY;
      box.width = availableWidth - box.margin.left - box.margin.right;
    } else {
      box.x = currentX;
      box.y = currentY;
    }

    for (const child of element.children || []) {
      this.layoutNode(child, styles, box, box.width);
    }

    if (box.display === 'block') {
      box.height = Math.max(
        box.padding.top + box.padding.bottom,
        (box.children.length > 0
          ? box.children[box.children.length - 1].y + box.children[box.children.length - 1].height
          : box.y) - box.y
      );
    } else {
      box.height = this.fontSizeMap[element.tag] || 16;
    }

    parentBox.children.push(box);
  }

  private layoutText(textNode: any, parentBox: LayoutBox, availableWidth: number): void {
    const box = this.createLayoutBox(textNode);
    box.display = 'inline';
    box.x = parentBox.x + parentBox.padding.left;
    box.y = parentBox.y + parentBox.padding.top;
    box.width = availableWidth;
    box.height = 16;
    parentBox.children.push(box);
  }

  private applyBoxModel(box: LayoutBox, style: Record<string, string>, availableWidth: number): void {
    const parsePx = (value: string | undefined): number => {
      if (!value) return 0;
      return parseInt(value.replace('px', '')) || 0;
    };

    box.margin = {
      top: parsePx(style['margin-top'] || style.margin),
      right: parsePx(style['margin-right'] || style.margin),
      bottom: parsePx(style['margin-bottom'] || style.margin),
      left: parsePx(style['margin-left'] || style.margin),
    };

    box.padding = {
      top: parsePx(style['padding-top'] || style.padding),
      right: parsePx(style['padding-right'] || style.padding),
      bottom: parsePx(style['padding-bottom'] || style.padding),
      left: parsePx(style['padding-left'] || style.padding),
    };

    box.border = {
      top: parsePx(style['border-top-width']) || (style['border'] ? 1 : 0),
      right: parsePx(style['border-right-width']) || (style['border'] ? 1 : 0),
      bottom: parsePx(style['border-bottom-width']) || (style['border'] ? 1 : 0),
      left: parsePx(style['border-left-width']) || (style['border'] ? 1 : 0),
    };
  }

  private getComputedStyle(element: any, styles: any): Record<string, string> {
    const computed: Record<string, string> = {};
    if (styles && Array.isArray(styles)) {
      for (const rule of styles) {
        if (this.selectorMatches(rule.selector, element)) {
          Object.assign(computed, rule.declarations);
        }
      }
    }
    return computed;
  }

  private selectorMatches(selector: string, element: any): boolean {
    if (selector === '*') return true;
    if (selector === element.tag) return true;
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return (element.attributes?.class || '').split(/\s+/).includes(className);
    }
    if (selector.startsWith('#')) {
      const idValue = selector.slice(1);
      return element.attributes?.id === idValue;
    }
    return false;
  }

  private createLayoutBox(element: any): LayoutBox {
    return {
      element,
      x: 0, y: 0, width: 0, height: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      border: { top: 0, right: 0, bottom: 0, left: 0 },
      display: 'block',
      children: [],
    };
  }

  private isBlockElement(tag?: string): boolean {
    return this.blockElements.has(tag?.toLowerCase() || '');
  }
}
EOFLAYOUT

echo "✓ LayoutEngine created"

# DOM Element
cat > src/backend/dom/DomElement.ts << 'EOFDOM'
export type EventListener = (event: BrowserEvent) => void;

export interface BrowserEvent {
  type: string;
  target: DomElement | null;
  currentTarget: DomElement | null;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export class DomElement {
  private children: DomElement[] = [];
  private parent: DomElement | null = null;
  private listeners: Map<string, EventListener[]> = new Map();
  private defaultPrevented = false;
  private propagationStopped = false;

  constructor(
    public tag: string,
    public attributes: Record<string, string> = {},
    public text: string = ''
  ) {}

  appendChild(child: DomElement): void {
    this.children.push(child);
    child.parent = this;
  }

  removeChild(child: DomElement): void {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  getChildren(): DomElement[] {
    return [...this.children];
  }

  getParent(): DomElement | null {
    return this.parent;
  }

  querySelector(selector: string): DomElement | null {
    return this.selectElement(selector);
  }

  querySelectorAll(selector: string): DomElement[] {
    const results: DomElement[] = [];
    this.selectAllElements(selector, results);
    return results;
  }

  getElementById(id: string): DomElement | null {
    if (this.attributes.id === id) return this;
    for (const child of this.children) {
      const result = child.getElementById(id);
      if (result) return result;
    }
    return null;
  }

  getElementsByTagName(tag: string): DomElement[] {
    const results: DomElement[] = [];
    this.collectByTag(tag, results);
    return results;
  }

  getElementsByClassName(className: string): DomElement[] {
    const results: DomElement[] = [];
    this.collectByClass(className, results);
    return results;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name.toLowerCase()] = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name.toLowerCase()] ?? null;
  }

  hasAttribute(name: string): boolean {
    return name.toLowerCase() in this.attributes;
  }

  removeAttribute(name: string): void {
    delete this.attributes[name.toLowerCase()];
  }

  addEventListener(eventType: string, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  removeEventListener(eventType: string, listener: EventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    }
  }

  dispatchEvent(event: BrowserEvent): void {
    event.currentTarget = this;
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
        if (this.propagationStopped) break;
      }
    }

    if (!this.propagationStopped && this.parent) {
      this.parent.dispatchEvent(event);
    }

    this.propagationStopped = false;
  }

  click(): void {
    const event: BrowserEvent = {
      type: 'click',
      target: this,
      currentTarget: this,
      preventDefault: () => { this.defaultPrevented = true; },
      stopPropagation: () => { this.propagationStopped = true; },
    };
    this.dispatchEvent(event);
  }

  private selectElement(selector: string): DomElement | null {
    if (this.matchesSelector(selector)) return this;
    for (const child of this.children) {
      const result = child.selectElement(selector);
      if (result) return result;
    }
    return null;
  }

  private selectAllElements(selector: string, results: DomElement[]): void {
    if (this.matchesSelector(selector)) results.push(this);
    for (const child of this.children) {
      child.selectAllElements(selector, results);
    }
  }

  private collectByTag(tag: string, results: DomElement[]): void {
    if (this.tag === tag.toLowerCase()) results.push(this);
    for (const child of this.children) {
      child.collectByTag(tag, results);
    }
  }

  private collectByClass(className: string, results: DomElement[]): void {
    const classes = (this.attributes.class || '').split(/\s+/);
    if (classes.includes(className)) results.push(this);
    for (const child of this.children) {
      child.collectByClass(className, results);
    }
  }

  private matchesSelector(selector: string): boolean {
    if (selector === '*') return true;
    if (selector === this.tag) return true;
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return (this.attributes.class || '').split(/\s+/).includes(className);
    }
    if (selector.startsWith('#')) {
      const idValue = selector.slice(1);
      return this.attributes.id === idValue;
    }
    return false;
  }
}
EOFDOM

echo "✓ DomElement created"

# Event Emitter
cat > src/backend/dom/EventEmitter.ts << 'EOFEMIT'
export type EventListener = (event: BrowserEvent) => void;

export interface BrowserEvent {
  type: string;
  target: any;
  currentTarget: any;
  key?: string;
  value?: string;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export class EventEmitter {
  private listeners: Map<string, EventListener[]> = new Map();

  on(eventType: string, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: string, listener: EventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    }
  }

  emit(eventType: string, event: BrowserEvent): void {
    const listeners = this.listeners.get(eventType) || [];
    for (const listener of listeners) {
      listener(event);
    }
  }

  once(eventType: string, listener: EventListener): void {
    const onceWrapper: EventListener = (event: BrowserEvent) => {
      listener(event);
      this.off(eventType, onceWrapper);
    };
    this.on(eventType, onceWrapper);
  }

  createClickEvent(target: any): BrowserEvent {
    return {
      type: 'click',
      target,
      currentTarget: target,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
  }

  createInputEvent(target: any, value: string): BrowserEvent {
    return {
      type: 'input',
      target,
      currentTarget: target,
      value,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
  }

  createChangeEvent(target: any, value: string): BrowserEvent {
    return {
      type: 'change',
      target,
      currentTarget: target,
      value,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
  }

  createSubmitEvent(target: any): BrowserEvent {
    return {
      type: 'submit',
      target,
      currentTarget: target,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
  }

  createKeyboardEvent(type: 'keydown' | 'keyup', key: string, target: any): BrowserEvent {
    return {
      type,
      target,
      currentTarget: target,
      key,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
  }
}
EOFEMIT

echo "✓ EventEmitter created"

echo "All source files created successfully!"
