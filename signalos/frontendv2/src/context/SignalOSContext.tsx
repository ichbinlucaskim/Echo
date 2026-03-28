"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSignalOS, type SignalOSState } from "../lib/socket";

const SignalOSContext = createContext<SignalOSState | null>(null);

export function SignalOSProvider({ children }: { children: ReactNode }) {
  const state = useSignalOS();
  return (
    <SignalOSContext.Provider value={state}>
      {children}
    </SignalOSContext.Provider>
  );
}

export function useSignalOSContext(): SignalOSState {
  const ctx = useContext(SignalOSContext);
  if (!ctx) {
    throw new Error("useSignalOSContext must be used within SignalOSProvider");
  }
  return ctx;
}
