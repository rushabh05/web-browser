import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const AddressBarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
`;

const Button = styled.button`
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: #f0f0f0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UrlInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;

  &:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
  }
`;

const StatusText = styled.div`
  font-size: 12px;
  color: #666;
  min-width: 200px;
`;

interface AddressBarProps {
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  currentUrl: string;
  isLoading: boolean;
}

export const AddressBar: React.FC<AddressBarProps> = ({
  onNavigate,
  onBack,
  onForward,
  onReload,
  canGoBack,
  canGoForward,
  currentUrl,
  isLoading,
}) => {
  const [url, setUrl] = useState(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(currentUrl);
  }, [currentUrl]);

  const handleNavigate = () => {
    let urlToNavigate = url;
    if (!urlToNavigate.startsWith('http://') && !urlToNavigate.startsWith('https://')) {
      urlToNavigate = 'https://' + urlToNavigate;
    }
    onNavigate(urlToNavigate);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <AddressBarContainer>
      <Button onClick={onBack} disabled={!canGoBack} title="Back">
        ← Back
      </Button>
      <Button onClick={onForward} disabled={!canGoForward} title="Forward">
        Forward →
      </Button>
      <Button onClick={onReload} disabled={isLoading} title="Reload">
        ⟳ Reload
      </Button>
      <UrlInput
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter URL..."
      />
      <Button onClick={handleNavigate} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Go'}
      </Button>
      <StatusText>{isLoading ? 'Loading...' : 'Ready'}</StatusText>
    </AddressBarContainer>
  );
};
