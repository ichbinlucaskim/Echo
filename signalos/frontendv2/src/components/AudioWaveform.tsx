"use client";

import { useMemo } from "react";

const BAR_COUNT = 9;

/** Animated center bars — simulates active speech / audio. */
export default function AudioWaveform() {
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        i,
        duration: 0.45 + (i % 4) * 0.12,
        delay: i * 0.08,
        minScale: 0.25 + (i % 3) * 0.08,
        maxScale: 0.55 + (i % 5) * 0.12,
      })),
    []
  );

  return (
    <div
      className="flex items-center justify-center gap-1.5 md:gap-2 h-40 md:h-52"
      aria-hidden
    >
      {bars.map(({ i, duration, delay, minScale, maxScale }) => (
        <span
          key={i}
          className="audio-wave-bar w-1.5 md:w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)]"
          style={
            {
              "--wave-dur": `${duration}s`,
              "--wave-delay": `${delay}s`,
              "--wave-min": minScale,
              "--wave-max": maxScale,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
