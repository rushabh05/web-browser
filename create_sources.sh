#!/bin/bash

# Create all source files

mkdir -p src/backend/parser/__tests__
mkdir -p src/backend/layout/__tests__
mkdir -p src/backend/dom/__tests__

# Backend - Types
cat > src/backend/types/index.ts << 'EOFTYPE'
export interface BrowserResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FetchUrlResult extends BrowserResult<string> {
  html?: string;
  status?: number;
  headers?: Record<string, string>;
}

export interface ParseHtmlResult extends BrowserResult<any> {
  dom?: any;
}

export interface ParseCssResult extends BrowserResult<any> {
  rules?: any;
}

export interface LayoutResult extends BrowserResult<any> {
  layoutTree?: any;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  layoutTree?: any;
  isActive: boolean;
}

export interface BrowserHistory {
  entries: Array<{
    url: string;
    title: string;
    timestamp: number;
  }>;
  currentIndex: number;
}
EOFTYPE

echo "✓ Types created"
