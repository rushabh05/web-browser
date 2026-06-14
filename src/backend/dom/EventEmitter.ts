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
