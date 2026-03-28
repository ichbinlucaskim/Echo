"use client";

import { useMemo } from "react";

const BAR_COUNT = 9;

/** Mock silhouette L→R: medium, tall, very tall, medium, tall, short, tall, medium, short */
const BAR_HEIGHTS_PX = [86, 110, 128, 86, 104, 58, 100, 86, 58];
const BAR_WIDTHS_PX = [11, 12, 13, 11, 12, 10, 12, 11, 10];

type AudioWaveformProps = {
  /** Pause animation when monitoring is muted or call is on hold. */
  paused?: boolean;
};

/** Animated center bars — simulates live audio (matches dashboard mock). */
export default function AudioWaveform({ paused = false }: AudioWaveformProps) {
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        i,
        height: BAR_HEIGHTS_PX[i] ?? 72,
        width: BAR_WIDTHS_PX[i] ?? 9,
        duration: 0.42 + (i % 5) * 0.1,
        delay: i * 0.07,
        minScale: 0.28 + (i % 3) * 0.06,
        maxScale: 0.72 + (i % 4) * 0.08,
      })),
    []
  );

  return (
    <div
      className={`flex items-end justify-center gap-[12px] md:gap-[18px] py-2 md:py-3 w-full max-w-md mx-auto ${paused ? "waveform-paused" : ""}`}
      aria-hidden
    >
      {bars.map(({ i, height, width, duration, delay, minScale, maxScale }) => (
        <span
          key={i}
          className="audio-wave-bar rounded-full bg-white"
          style={
            {
              height: `${height}px`,
              width: `${width}px`,
              boxShadow: "0 0 14px rgba(255,255,255,0.25)",
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
