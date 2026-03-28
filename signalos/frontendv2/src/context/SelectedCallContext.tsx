"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SelectedCallContextValue = {
  selectedCallId: string | null;
  selectCall: (callId: string) => void;
  clearSelection: () => void;
};

const SelectedCallContext = createContext<SelectedCallContextValue | null>(
  null
);

export function SelectedCallProvider({ children }: { children: ReactNode }) {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const selectCall = useCallback((callId: string) => {
    setSelectedCallId(callId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCallId(null);
  }, []);

  const value = useMemo(
    () => ({ selectedCallId, selectCall, clearSelection }),
    [selectedCallId, selectCall, clearSelection]
  );

  return (
    <SelectedCallContext.Provider value={value}>
      {children}
    </SelectedCallContext.Provider>
  );
}

export function useSelectedCall(): SelectedCallContextValue {
  const ctx = useContext(SelectedCallContext);
  if (!ctx) {
    throw new Error("useSelectedCall must be used within SelectedCallProvider");
  }
  return ctx;
}
