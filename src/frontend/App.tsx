import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

// ─── Global reset ─────────────────────────────────────────────────────────────
const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.2); border-radius: 3px; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tab {
  id: string;
  url: string;
  title: string;
  favicon: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NEW_TAB_URL = 'https://www.google.com';

function resolveUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return NEW_TAB_URL;
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('about:')) return t;
  if (t.includes('.') && !t.includes(' ')) return 'https://' + t;
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}

function displayUrl(url: string) {
  try { const u = new URL(url); return u.hostname + (u.pathname !== '/' ? u.pathname : ''); }
  catch { return url; }
}

// ─── Styled components ────────────────────────────────────────────────────────
const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #202124;
  user-select: none;
`;

/* ── Tab bar ── */
const TabBar = styled.div`
  display: flex;
  align-items: flex-end;
  height: 36px;
  padding: 0 8px;
  background: #35363a;
  gap: 2px;
  -webkit-app-region: drag;
  flex-shrink: 0;
`;

const TabItem = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  min-width: 80px;
  flex: 1;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px 8px 0 0;
  background: ${p => p.active ? '#ffffff' : 'transparent'};
  color: ${p => p.active ? '#202124' : '#9aa0a6'};
  font-size: 12px;
  cursor: pointer;
  position: relative;
  transition: background .12s, color .12s;
  -webkit-app-region: no-drag;
  overflow: hidden;
  &:hover { background: ${p => p.active ? '#ffffff' : 'rgba(255,255,255,.1)'}; color: ${p => p.active ? '#202124' : '#e8eaed'}; }
`;

const TabFavicon = styled.img`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 2px;
`;

const TabFaviconPlaceholder = styled.div`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 2px;
  background: linear-gradient(135deg, #5f6368 0%, #9aa0a6 100%);
`;

const TabTitle = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
`;

const TabLoadingDot = styled.span<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.active ? '#1a73e8' : '#9aa0a6'};
  animation: pulse 1s infinite;
  flex-shrink: 0;
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
`;

const TabClose = styled.button`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
  opacity: .6;
  transition: background .1s, opacity .1s;
  &:hover { background: rgba(0,0,0,.15); opacity: 1; }
`;

const NewTabBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: center;
  margin-bottom: 4px;
  -webkit-app-region: no-drag;
  transition: background .1s, color .1s;
  &:hover { background: rgba(255,255,255,.12); color: #e8eaed; }
`;

/* ── Navigation bar ── */
const NavBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #ffffff;
  height: 56px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
`;

const NavBtn = styled.button<{ disabled?: boolean }>`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${p => p.disabled ? '#bdc1c6' : '#5f6368'};
  font-size: 16px;
  cursor: ${p => p.disabled ? 'default' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .1s;
  &:hover { background: ${p => p.disabled ? 'transparent' : 'rgba(0,0,0,.06)'}; }
`;

const UrlBarWrapper = styled.form`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 24px;
  background: #f1f3f4;
  border: 2px solid transparent;
  transition: border-color .15s, background .15s, box-shadow .15s;
  &:focus-within {
    background: #fff;
    border-color: #1a73e8;
    box-shadow: 0 0 0 3px rgba(26,115,232,.15);
  }
`;

const LockIcon = styled.span`
  font-size: 13px;
  color: #5f6368;
  flex-shrink: 0;
`;

const UrlInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #202124;
  outline: none;
  &::selection { background: rgba(26,115,232,.25); }
`;

/* ── Content area ── */
const ContentArea = styled.div`
  flex: 1;
  background: #fff;
  position: relative;
  overflow: hidden;
`;

// ─── Component ────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  const [tabs, setTabs]         = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlFocused, setUrlFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeId) ?? null;

  // ── Tab helpers ──
  const updateTab = useCallback((id: string, patch: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  // ── IPC event wiring ──
  useEffect(() => {
    const nav = window.browserNav;
    if (!nav) return;

    nav.onNavigate((tabId, url) => updateTab(tabId, { url }));
    nav.onLoading( (tabId, loading) => updateTab(tabId, { isLoading: loading }));
    nav.onTitle(   (tabId, title)   => updateTab(tabId, { title: title || 'New Tab' }));
    nav.onFavicon( (tabId, url)     => updateTab(tabId, { favicon: url }));
    nav.onCanNav(  (tabId, back, fwd) => updateTab(tabId, { canGoBack: back, canGoForward: fwd }));

    // Keyboard shortcut: open new tab (from main process menu / Cmd+T inside page)
    nav.onNewTabCreated((id, url) => {
      const newTab: Tab = { id, url, title: 'New Tab', favicon: '', isLoading: true, canGoBack: false, canGoForward: false };
      setTabs(prev => [...prev, newTab]);
      setActiveId(id);
      setUrlInput(url);
    });

    // Keyboard shortcut: close tab (from main process menu / Cmd+W inside page)
    nav.onTabClosed((closedId, nextId) => {
      setTabs(prev => prev.filter(t => t.id !== closedId));
      setActiveId(nextId);
    });

    // Cmd+L / address bar focus from menu
    nav.onFocusAddressBar(() => {
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50);
    });

    // Open first tab
    nav.newTab(NEW_TAB_URL).then(id => {
      const newTab: Tab = { id, url: NEW_TAB_URL, title: 'New Tab', favicon: '', isLoading: true, canGoBack: false, canGoForward: false };
      setTabs([newTab]);
      setActiveId(id);
      setUrlInput(NEW_TAB_URL);
    });

    return () => nav.removeAllListeners();
  }, []);

  // Sync URL input when active tab URL changes
  useEffect(() => {
    if (activeTab && !urlFocused) setUrlInput(activeTab.url);
  }, [activeTab?.url, urlFocused]);

  // ── Actions ──
  const openNewTab = useCallback(async (url = NEW_TAB_URL) => {
    const id = await window.browserNav.newTab(url);
    const newTab: Tab = { id, url, title: 'New Tab', favicon: '', isLoading: true, canGoBack: false, canGoForward: false };
    setTabs(prev => [...prev, newTab]);
    setActiveId(id);
    setUrlInput(url);
    inputRef.current?.select();
  }, []);

  const closeTab = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const remainingId = await window.browserNav.closeTab(id);
    setTabs(prev => prev.filter(t => t.id !== id));
    if (remainingId) { setActiveId(remainingId); }
  }, []);

  const switchTab = useCallback((id: string) => {
    window.browserNav.switchTab(id);
    setActiveId(id);
  }, []);

  const navigate = useCallback((raw: string) => {
    if (!activeId) return;
    const url = resolveUrl(raw);
    updateTab(activeId, { url, isLoading: true });
    setUrlInput(url);
    window.browserNav.navigateTo(activeId, url);
    inputRef.current?.blur();
  }, [activeId, updateTab]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); navigate(urlInput); };

  return (
    <>
      <GlobalStyle />
      <Shell>
        {/* ── Tab bar ── */}
        <TabBar>
          {tabs.map(tab => (
            <TabItem key={tab.id} active={tab.id === activeId} onClick={() => switchTab(tab.id)} title={tab.title}>
              {tab.isLoading
                ? <TabLoadingDot active={tab.id === activeId} />
                : tab.favicon
                  ? <TabFavicon src={tab.favicon} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                  : <TabFaviconPlaceholder />
              }
              <TabTitle>{tab.title || 'New Tab'}</TabTitle>
              {tabs.length > 1 && (
                <TabClose onClick={e => closeTab(e, tab.id)} title="Close tab">×</TabClose>
              )}
            </TabItem>
          ))}
          <NewTabBtn onClick={() => openNewTab()} title="New tab">+</NewTabBtn>
        </TabBar>

        {/* ── Nav bar ── */}
        <NavBar>
          <NavBtn disabled={!activeTab?.canGoBack}    onClick={() => activeId && window.browserNav.goBack(activeId)}    title="Back">&#8592;</NavBtn>
          <NavBtn disabled={!activeTab?.canGoForward} onClick={() => activeId && window.browserNav.goForward(activeId)} title="Forward">&#8594;</NavBtn>
          <NavBtn onClick={() => activeId && (activeTab?.isLoading ? window.browserNav.stop(activeId) : window.browserNav.reload(activeId))} title={activeTab?.isLoading ? 'Stop' : 'Reload'}>
            {activeTab?.isLoading ? '✕' : '↻'}
          </NavBtn>

          <UrlBarWrapper onSubmit={handleSubmit}>
            <LockIcon>
              {activeTab?.url?.startsWith('https') ? '🔒' : '🔓'}
            </LockIcon>
            <UrlInput
              ref={inputRef}
              value={urlFocused ? urlInput : (activeTab ? displayUrl(activeTab.url) : '')}
              onChange={e => setUrlInput(e.target.value)}
              onFocus={() => { setUrlFocused(true); setUrlInput(activeTab?.url ?? ''); inputRef.current?.select(); }}
              onBlur={() => { setUrlFocused(false); }}
              placeholder="Search or enter URL"
              spellCheck={false}
            />
          </UrlBarWrapper>

          <NavBtn onClick={() => openNewTab()} title="New tab" style={{ fontSize: 20 }}>⊕</NavBtn>
        </NavBar>

        {/* BrowserView renders here (native layer above this div) */}
        <ContentArea />
      </Shell>
    </>
  );
};
