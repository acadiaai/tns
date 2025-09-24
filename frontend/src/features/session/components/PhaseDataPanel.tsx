import React from 'react';
import { SessionDataExplorer } from './SessionDataExplorer';

interface PhaseDataPanelProps {
  sessionId: string;
  sessionData?: any;
  allPhases?: any[];
}

export const PhaseDataPanel: React.FC<PhaseDataPanelProps> = ({
  sessionId,
  sessionData,
  allPhases
}) => {
  return (
    <SessionDataExplorer
      sessionId={sessionId}
      sessionData={sessionData}
      allPhases={allPhases}
    />
  );
};