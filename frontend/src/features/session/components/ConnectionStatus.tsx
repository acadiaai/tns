import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  if (isConnected) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
      <p className="text-sm text-yellow-300">
        Connecting to session...
      </p>
    </div>
  );
};