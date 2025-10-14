import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RecordingContextType {
  forceNew: boolean;
  setForceNew: (value: boolean) => void;
  hasStartedRecording: boolean;
  setHasStartedRecording: (value: boolean) => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

interface RecordingProviderProps {
  children: ReactNode;
}

export const RecordingProvider: React.FC<RecordingProviderProps> = ({ children }) => {
  const [forceNew, setForceNew] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);

  const value = {
    forceNew,
    setForceNew,
    hasStartedRecording,
    setHasStartedRecording,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
};

export const useRecording = (): RecordingContextType => {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
};
