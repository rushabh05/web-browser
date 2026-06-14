export class BrowserError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}

export class NetworkError extends BrowserError {
  constructor(message: string, originalError?: Error) {
    super('NETWORK_ERROR', message, originalError);
    this.name = 'NetworkError';
  }
}

export class ParseError extends BrowserError {
  constructor(message: string, originalError?: Error) {
    super('PARSE_ERROR', message, originalError);
    this.name = 'ParseError';
  }
}

export class LayoutError extends BrowserError {
  constructor(message: string, originalError?: Error) {
    super('LAYOUT_ERROR', message, originalError);
    this.name = 'LayoutError';
  }
}

export class ScriptError extends BrowserError {
  constructor(message: string, originalError?: Error) {
    super('SCRIPT_ERROR', message, originalError);
    this.name = 'ScriptError';
  }
}

export class ErrorHandler {
  static handleError(error: unknown): string {
    if (error instanceof BrowserError) {
      return `[${error.code}] ${error.message}`;
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    return `Unknown error: ${String(error)}`;
  }

  static logError(error: unknown, context?: string): void {
    const message = this.handleError(error);
    const prefix = context ? `[${context}]` : '';
    console.error(`${prefix} ${message}`);

    if (error instanceof BrowserError && error.originalError) {
      console.error('Original error:', error.originalError);
    }
  }

  static createErrorMessage(code: string, details?: string): string {
    const messages: Record<string, string> = {
      NETWORK_ERROR: 'Failed to load page',
      PARSE_ERROR: 'Failed to parse page content',
      LAYOUT_ERROR: 'Failed to lay out page',
      SCRIPT_ERROR: 'Script execution failed',
      INVALID_URL: 'Invalid URL',
      TIMEOUT: 'Request timed out',
    };

    const base = messages[code] || 'An error occurred';
    return details ? `${base}: ${details}` : base;
  }
}
