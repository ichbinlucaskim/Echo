"use client";

import { useEffect } from "react";
import { AlertPayload } from "../types";

const AUTO_DISMISS_MS = 30_000;

interface AlertBannerProps {
  alert: AlertPayload | null;
  onDismiss: () => void;
}

export default function AlertBanner({
  alert,
  onDismiss,
}: AlertBannerProps): React.JSX.Element {
  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return (): void => clearTimeout(timer);
  }, [alert, onDismiss]);

  const confidencePct = alert ? Math.round(alert.confidence * 100) : 0;

  return (
    // Slide in from top using max-height transition
    <div
      className="w-full overflow-hidden"
      style={{
        maxHeight: alert ? "10rem" : "0",
        transition: "max-height 0.3s ease-in-out",
      }}
    >
      <div className="bg-red-700 border-b-2 border-red-500 text-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Headline */}
            <p className="font-bold font-mono text-base tracking-wide">
              ⚠ CALL {alert?.callId.slice(-6).toUpperCase()} —{" "}
              {alert?.anomalyType} DETECTED ({confidencePct}% confidence)
            </p>

            {/* Suggested response */}
            <p className="text-red-200 text-sm mt-1 font-mono">
              Suggested: &ldquo;{alert?.suggestedResponse}&rdquo;
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="shrink-0 text-red-200 hover:text-white text-xl font-bold leading-none mt-0.5 transition-colors"
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
