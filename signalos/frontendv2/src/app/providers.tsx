"use client";

import type { ReactNode } from "react";
import { SignalOSProvider } from "../context/SignalOSContext";

export function Providers({ children }: { children: ReactNode }) {
  return <SignalOSProvider>{children}</SignalOSProvider>;
}
