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
