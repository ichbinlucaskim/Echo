import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const BACKEND_URL =
  process.env.SIMULATOR_WS_URL ?? "ws://localhost:3001/twilio";
const SAMPLES_DIR = path.resolve(__dirname, "../../audio/samples");
const CHUNK_SIZE = 160; // 8kHz × 20ms = 160 bytes per Twilio frame
const CHUNK_INTERVAL_MS = 20;
const WAV_HEADER_BYTES = 44;

// ─── Stream definitions ───────────────────────────────────────────────────────

interface SimStream {
  callId: string;
  audioFile: string;
}

const STREAMS: SimStream[] = [
  { callId: "sim_call_1", audioFile: "normal_call_1.wav" },
  { callId: "sim_call_2", audioFile: "normal_call_2.wav" },
  { callId: "sim_call_3", audioFile: "distress_test.wav" },
  { callId: "sim_call_4", audioFile: "whisper_test.wav" },
];

// ─── Audio loading ────────────────────────────────────────────────────────────

function loadAudioChunks(filename: string): Buffer[] {
  const filepath = path.join(SAMPLES_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.warn(
      `[Simulator] File not found: ${filename} — using silence (0xFF μ-law)`
    );
    // 0xFF = near-silence in μ-law encoding; 100 chunks ≈ 2 seconds
    return Array.from({ length: 100 }, (): Buffer =>
      Buffer.alloc(CHUNK_SIZE, 0xff)
    );
  }

  const raw = fs.readFileSync(filepath);
  const pcmData = raw.subarray(WAV_HEADER_BYTES);
  const chunks: Buffer[] = [];

  for (let i = 0; i + CHUNK_SIZE <= pcmData.length; i += CHUNK_SIZE) {
    chunks.push(pcmData.subarray(i, i + CHUNK_SIZE));
  }

  if (chunks.length === 0) {
    console.warn(
      `[Simulator] File ${filename} has no usable audio — using silence`
    );
    return Array.from({ length: 100 }, (): Buffer =>
      Buffer.alloc(CHUNK_SIZE, 0xff)
    );
  }

  console.log(
    `[Simulator] Loaded ${filename} — ${chunks.length} chunks (${(chunks.length * CHUNK_INTERVAL_MS) / 1000}s)`
  );
  return chunks;
}

// ─── Twilio message builders ──────────────────────────────────────────────────

function buildStartMessage(callId: string): string {
  return JSON.stringify({
    event: "start",
    sequenceNumber: "1",
    streamSid: `sim_stream_${callId}`,
    start: {
      accountSid: "ACsimulated",
      streamSid: `sim_stream_${callId}`,
      callSid: callId,
      tracks: ["inbound"],
      customParameters: {},
      mediaFormat: {
        encoding: "audio/x-mulaw",
        sampleRate: 8000,
        channels: 1,
      },
    },
  });
}

function buildMediaMessage(
  callId: string,
  chunk: Buffer,
  seq: number
): string {
  return JSON.stringify({
    event: "media",
    sequenceNumber: String(seq + 2),
    streamSid: `sim_stream_${callId}`,
    media: {
      track: "inbound",
      chunk: String(seq + 1),
      timestamp: String(seq * CHUNK_INTERVAL_MS),
      payload: chunk.toString("base64"),
    },
  });
}

function buildStopMessage(callId: string, totalChunks: number): string {
  return JSON.stringify({
    event: "stop",
    sequenceNumber: String(totalChunks + 2),
    streamSid: `sim_stream_${callId}`,
    stop: {
      accountSid: "ACsimulated",
      callSid: callId,
    },
  });
}

// ─── Single stream runner ─────────────────────────────────────────────────────

interface ActiveStream {
  callId: string;
  ws: WebSocket;
  interval: ReturnType<typeof setInterval>;
  chunksSent: number;
}

function runStream(
  stream: SimStream,
  chunks: Buffer[]
): Promise<ActiveStream> {
  return new Promise<ActiveStream>((resolve, reject) => {
    const { callId } = stream;
    const ws = new WebSocket(BACKEND_URL);
    let chunkIndex = 0;
    let chunksSent = 0;
    let interval: ReturnType<typeof setInterval>;

    ws.on("open", () => {
      console.log(`[Simulator] Stream connected — callId: ${callId}`);
      ws.send(buildStartMessage(callId));

      interval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const chunk = chunks[chunkIndex % chunks.length];
        ws.send(buildMediaMessage(callId, chunk, chunksSent));
        chunkIndex++;
        chunksSent++;
      }, CHUNK_INTERVAL_MS);

      resolve({ callId, ws, interval, chunksSent: 0 });
    });

    ws.on("error", (err: Error) => {
      console.error(`[Simulator] WebSocket error — callId: ${callId}: ${err.message}`);
      reject(err);
    });

    ws.on("close", (code: number) => {
      console.log(`[Simulator] Stream closed — callId: ${callId} | code: ${code}`);
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[Simulator] Starting 4 simulated streams → ${BACKEND_URL}`);

  // Pre-load audio for each stream
  const audioChunks: Map<string, Buffer[]> = new Map(
    STREAMS.map((s) => [s.callId, loadAudioChunks(s.audioFile)])
  );

  // Open all 5 streams with a small stagger to avoid thundering herd
  const activeStreams: ActiveStream[] = [];
  for (const stream of STREAMS) {
    try {
      const chunks = audioChunks.get(stream.callId) ?? [];
      const active = await runStream(stream, chunks);
      activeStreams.push(active);
      console.log(
        `[Simulator] Stream running — callId: ${stream.callId} | ${activeStreams.length}/4 active`
      );
      // 200ms stagger between stream opens
      await new Promise<void>((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(
        `[Simulator] Failed to start stream ${stream.callId}:`,
        err
      );
    }
  }

  console.log(
    `[Simulator] All streams running — ${activeStreams.length}/4 connected`
  );

  // Graceful shutdown on SIGINT
  process.on("SIGINT", () => {
    console.log("\n[Simulator] Shutting down — sending stop events...");
    for (const { callId, ws, interval, chunksSent } of activeStreams) {
      clearInterval(interval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buildStopMessage(callId, chunksSent));
        ws.close();
      }
    }
    console.log("[Simulator] All streams stopped.");
    process.exit(0);
  });
}

main().catch((err: Error) => {
  console.error("[Simulator] Fatal error:", err.message);
  process.exit(1);
});
