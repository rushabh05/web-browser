import React from 'react';
import styled from 'styled-components';

const InspectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
`;

const InspectorContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

const ElementTree = styled.div`
  color: #d4d4d4;
`;

const ElementLine = styled.div<{ depth: number }>`
  padding: 2px 0;
  padding-left: ${(props) => props.depth * 16}px;
  cursor: pointer;
  word-break: break-word;

  &:hover {
    background: #2d2d2d;
  }
`;

const AttributesList = styled.div`
  padding: 8px 0;
  border-top: 1px solid #333;
  margin-top: 8px;
`;

const Attribute = styled.div`
  color: #89d185;
  padding: 2px 0;
`;

const EmptyMessage = styled.div`
  padding: 16px;
  color: #999;
  text-align: center;
`;

interface InspectorProps {
  element?: any;
}

export const Inspector: React.FC<InspectorProps> = ({ element }) => {
  const renderElement = (el: any, depth: number = 0): JSX.Element | null => {
    if (!el) return null;

    if (el.type === 'text') {
      return (
        <ElementLine key={`${depth}-text`} depth={depth}>
          <span style={{ color: '#a8a8a8' }}>Text: "{el.text?.substring(0, 50)}"</span>
        </ElementLine>
      );
    }

    return (
      <div key={`${depth}-${el.tag}`}>
        <ElementLine depth={depth}>
          &lt;<span style={{ color: '#569cd6' }}>{el.tag}</span>
          {el.attributes &&
            Object.entries(el.attributes).map(([key, value]) => (
              <span key={key}>
                {' '}
                <span style={{ color: '#9cdcfe' }}>{key}</span>
                <span>=</span>
                <span style={{ color: '#ce9178' }}>"{String(value)}"</span>
              </span>
            ))}
          &gt;
        </ElementLine>
        {el.children &&
          el.children.map((child: any, index: number) =>
            renderElement(child, depth + 1)
          )}
      </div>
    );
  };

  if (!element) {
    return (
      <InspectorContainer>
        <EmptyMessage>No element selected. Click on an element to inspect it.</EmptyMessage>
      </InspectorContainer>
    );
  }

  return (
    <InspectorContainer>
      <InspectorContent>
        <ElementTree>
          {renderElement(element)}
          {element.attributes && Object.keys(element.attributes).length > 0 && (
            <AttributesList>
              <strong>Attributes:</strong>
              {Object.entries(element.attributes).map(([key, value]) => (
                <Attribute key={key}>
                  {key}: {String(value)}
                </Attribute>
              ))}
            </AttributesList>
          )}
        </ElementTree>
      </InspectorContent>
    </InspectorContainer>
  );
};
