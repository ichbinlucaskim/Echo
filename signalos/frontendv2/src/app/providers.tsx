"use client";

import type { ReactNode } from "react";
import { SignalOSProvider } from "../context/SignalOSContext";
import AlertPopup from "../components/AlertPopup";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SignalOSProvider>
      {children}
      <AlertPopup />
    </SignalOSProvider>
  );
}
