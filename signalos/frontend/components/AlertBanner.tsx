"use client";

import { AlertPayload } from "../types";

interface AlertBannerProps {
  alert: AlertPayload | null;
}

export default function AlertBanner({
  alert,
}: AlertBannerProps): React.JSX.Element | null {
  if (!alert) return null;

  const confidencePct = Math.round(alert.confidence * 100);

  return (
    <div className="w-full bg-red-600 text-white px-4 py-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold font-mono text-sm">
            {alert.callId.toUpperCase()} — {alert.anomalyType} DETECTED (
            {confidencePct}% confidence)
          </p>
          <p className="text-sm mt-1 text-red-100">
            Transcript: &ldquo;{alert.transcript}&rdquo;
          </p>
          <p className="text-sm mt-1 text-red-100">
            Suggested response: &ldquo;{alert.suggestedResponse}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
