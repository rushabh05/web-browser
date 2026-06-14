import React from 'react';
import styled from 'styled-components';

const ConsoleContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
`;

const LogList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: #1e1e1e;
  color: #d4d4d4;
`;

const LogLine = styled.div`
  padding: 2px 0;
  white-space: pre-wrap;
  word-break: break-word;

  &:hover {
    background: #2d2d2d;
  }
`;

const ErrorLog = styled(LogLine)`
  color: #f48771;
`;

const SuccessLog = styled(LogLine)`
  color: #89d185;
`;

interface ConsoleProps {
  logs: string[];
}

export const Console: React.FC<ConsoleProps> = ({ logs }) => {
  const getLogComponent = (log: string) => {
    if (log.includes('Error')) {
      return <ErrorLog key={log}>{log}</ErrorLog>;
    }
    if (log.includes('Loaded') || log.includes('ready')) {
      return <SuccessLog key={log}>{log}</SuccessLog>;
    }
    return <LogLine key={log}>{log}</LogLine>;
  };

  return (
    <ConsoleContainer>
      <LogList>
        {logs.map((log, index) => (
          <div key={index}>{getLogComponent(log)}</div>
        ))}
      </LogList>
    </ConsoleContainer>
  );
};
