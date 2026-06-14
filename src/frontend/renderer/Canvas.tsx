import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { RenderEngine } from './RenderEngine';

const CanvasContainer = styled.div`
  flex: 1;
  overflow: auto;
  background: white;
  position: relative;
`;

const StyledCanvas = styled.canvas`
  display: block;
  margin: 0;
  padding: 0;
`;

interface CanvasProps {
  layoutTree?: any;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ layoutTree, onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderEngineRef = useRef<RenderEngine | null>(null);
  const layoutTreeRef = useRef<any>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const redraw = () => {
        if (renderEngineRef.current && layoutTreeRef.current) {
          renderEngineRef.current.render(layoutTreeRef.current);
        }
      };

      const renderEngine = new RenderEngine(canvasRef.current, redraw);
      renderEngineRef.current = renderEngine;
      renderEngine.setCanvasSize(window.innerWidth - 320, window.innerHeight - 100);

      if (onCanvasReady) onCanvasReady(canvasRef.current);

      const handleResize = () => {
        renderEngine.setCanvasSize(window.innerWidth - 320, window.innerHeight - 100);
        redraw();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [onCanvasReady]);

  useEffect(() => {
    layoutTreeRef.current = layoutTree;
    if (layoutTree && renderEngineRef.current) {
      renderEngineRef.current.render(layoutTree);
    }
  }, [layoutTree]);

  return (
    <CanvasContainer>
      <StyledCanvas ref={canvasRef} />
    </CanvasContainer>
  );
};
