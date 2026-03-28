"use client";

import type { ReactNode } from "react";
import { SignalOSProvider } from "../context/SignalOSContext";
import { SelectedCallProvider } from "../context/SelectedCallContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SignalOSProvider>
      <SelectedCallProvider>{children}</SelectedCallProvider>
    </SignalOSProvider>
  );
}
