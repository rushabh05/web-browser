// @ts-nocheck
import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import styled from 'styled-components';

const WebViewWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #fff;

  webview {
    width: 100%;
    height: 100%;
    display: flex;
  }
`;

export interface BrowserWebViewHandle {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  loadURL: (url: string) => void;
  getURL: () => string;
  openDevTools: () => void;
}

interface BrowserWebViewProps {
  initialUrl?: string;
  onNavigate?: (url: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onTitleChange?: (title: string) => void;
  onConsoleMessage?: (level: number, message: string, source: string) => void;
  onCanGoBack?: (can: boolean) => void;
  onCanGoForward?: (can: boolean) => void;
}

export const BrowserWebView = forwardRef<BrowserWebViewHandle, BrowserWebViewProps>(
  ({ initialUrl = 'about:blank', onNavigate, onLoadStart, onLoadEnd, onTitleChange, onConsoleMessage, onCanGoBack, onCanGoForward }, ref) => {
    const webviewRef = React.useRef<HTMLElement>(null);

    const getWebview = () => webviewRef.current as any;

    useImperativeHandle(ref, () => ({
      goBack: () => getWebview()?.goBack?.(),
      goForward: () => getWebview()?.goForward?.(),
      reload: () => getWebview()?.reload?.(),
      stop: () => getWebview()?.stop?.(),
      loadURL: (url: string) => { const wv = getWebview(); if (wv) wv.src = url; },
      getURL: () => getWebview()?.getURL?.() || '',
      openDevTools: () => getWebview()?.openDevTools?.(),
    }));

    useEffect(() => {
      const wv = getWebview();
      if (!wv) return;

      const updateNavState = () => {
        onCanGoBack?.(wv.canGoBack?.() ?? false);
        onCanGoForward?.(wv.canGoForward?.() ?? false);
      };

      const handleNavigate = (e: any) => {
        onNavigate?.(e.url);
        updateNavState();
      };

      const handleLoadStart = () => onLoadStart?.();
      const handleLoadEnd = () => { onLoadEnd?.(); updateNavState(); };
      const handleTitle = (e: any) => onTitleChange?.(e.title);
      const handleConsole = (e: any) => onConsoleMessage?.(e.level, e.message, e.sourceId || '');
      const handleFailLoad = (e: any) => {
        // ERR_ABORTED (-3) is normal for JS-redirected SPAs — not a real error
        if (e.errorCode === -3) return;
        onConsoleMessage?.(2, `Failed to load: ${e.errorDescription} (${e.validatedURL})`, '');
      };

      wv.addEventListener('did-navigate', handleNavigate);
      wv.addEventListener('did-navigate-in-page', handleNavigate);
      wv.addEventListener('did-start-loading', handleLoadStart);
      wv.addEventListener('did-stop-loading', handleLoadEnd);
      wv.addEventListener('page-title-updated', handleTitle);
      wv.addEventListener('console-message', handleConsole);
      wv.addEventListener('did-fail-load', handleFailLoad);

      return () => {
        wv.removeEventListener('did-navigate', handleNavigate);
        wv.removeEventListener('did-navigate-in-page', handleNavigate);
        wv.removeEventListener('did-start-loading', handleLoadStart);
        wv.removeEventListener('did-stop-loading', handleLoadEnd);
        wv.removeEventListener('page-title-updated', handleTitle);
        wv.removeEventListener('console-message', handleConsole);
        wv.removeEventListener('did-fail-load', handleFailLoad);
      };
    }, [onNavigate, onLoadStart, onLoadEnd, onTitleChange, onConsoleMessage, onCanGoBack, onCanGoForward]);

    const WebView = 'webview' as any;
    const chromeUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    return (
      <WebViewWrapper>
        {React.createElement(WebView, {
          ref: webviewRef,
          src: initialUrl,
          useragent: chromeUA,
          allowpopups: 'true',
          style: { width: '100%', height: '100%', display: 'flex' },
        })}
      </WebViewWrapper>
    );
  }
);

BrowserWebView.displayName = 'BrowserWebView';
