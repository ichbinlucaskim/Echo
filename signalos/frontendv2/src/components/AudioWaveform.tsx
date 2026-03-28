"use client";

import { useMemo } from "react";

const BAR_COUNT = 9;

/** Mock silhouette L→R: medium, tall, very tall, medium, tall, short, tall, medium, short */
const BAR_HEIGHTS_PX = [132, 168, 198, 132, 162, 88, 156, 132, 88];
const BAR_WIDTHS_PX = [14, 16, 18, 14, 16, 12, 16, 14, 12];

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
      className={`mx-auto flex w-full max-w-2xl items-end justify-center gap-4 py-4 md:gap-6 md:py-6 lg:max-w-3xl lg:gap-7 ${paused ? "waveform-paused" : ""}`}
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
              boxShadow: "0 0 20px rgba(255,255,255,0.35)",
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
