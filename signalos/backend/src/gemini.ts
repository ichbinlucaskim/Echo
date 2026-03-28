import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

const GEMINI_MODEL = "models/gemini-2.0-flash-live-001";

// ─── Outbound message types ───────────────────────────────────────────────────

interface GeminiSetupMessage {
  setup: {
    model: string;
    generation_config?: {
      response_modalities: string[];
    };
  };
}

interface GeminiRealtimeInput {
  realtimeInput: {
    mediaChunks: Array<{
      mimeType: string;
      data: string;
    }>;
  };
}

type GeminiOutboundMessage = GeminiSetupMessage | GeminiRealtimeInput;

// ─── Inbound response types ───────────────────────────────────────────────────

interface GeminiTextPart {
  text: string;
}

interface GeminiFunctionCallPart {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
}

type GeminiPart = GeminiTextPart | GeminiFunctionCallPart;

interface GeminiServerMessage {
  serverContent?: {
    modelTurn?: {
      parts: GeminiPart[];
    };
    turnComplete?: boolean;
  };
}

// ─── Parsed response passed to callers ───────────────────────────────────────

export interface GeminiTextResponse {
  type: "text";
  text: string;
}

export interface GeminiFunctionCallResponse {
  type: "functionCall";
  name: string;
  args: Record<string, unknown>;
}

export type GeminiResponse = GeminiTextResponse | GeminiFunctionCallResponse;

// ─── Low-level session (one per callId) ──────────────────────────────────────

class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly onResponse: (response: GeminiResponse) => void;
  private setupComplete = false;

  constructor(
    apiKey: string,
    onResponse: (response: GeminiResponse) => void
  ) {
    this.apiKey = apiKey;
    this.onResponse = onResponse;
  }

  open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = `${GEMINI_LIVE_WS_URL}?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        const setup: GeminiSetupMessage = {
          setup: {
            model: GEMINI_MODEL,
            generation_config: {
              response_modalities: ["TEXT"],
            },
          },
        };
        this.send(setup);
      });

      this.ws.on("message", (raw: Buffer) => {
        const text = raw.toString();
        let parsed: Record<string, unknown>;

        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          console.warn("[Gemini] Non-JSON message:", text.slice(0, 120));
          return;
        }

        // Setup handshake
        if (!this.setupComplete && "setupComplete" in parsed) {
          this.setupComplete = true;
          resolve();
          return;
        }

        // Content response
        const msg = parsed as GeminiServerMessage;
        const parts = msg.serverContent?.modelTurn?.parts ?? [];

        for (const part of parts) {
          if ("text" in part && typeof part.text === "string" && part.text.trim()) {
            this.onResponse({ type: "text", text: part.text });
          } else if ("functionCall" in part) {
            this.onResponse({
              type: "functionCall",
              name: part.functionCall.name,
              args: part.functionCall.args,
            });
          }
        }
      });

      this.ws.on("error", (err: Error) => {
        console.error("[Gemini] WebSocket error:", err.message);
        reject(err);
      });

      this.ws.on("close", (code: number) => {
        console.log(`[Gemini] WebSocket closed — code: ${code}`);
        this.setupComplete = false;
      });
    });
  }

  sendAudio(pcm16kBuffer: Buffer): void {
    if (!this.isReady()) return;

    const message: GeminiRealtimeInput = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: pcm16kBuffer.toString("base64"),
          },
        ],
      },
    };

    this.send(message);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.setupComplete = false;
  }

  isReady(): boolean {
    return this.setupComplete && this.ws?.readyState === WebSocket.OPEN;
  }

  private send(message: GeminiOutboundMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

// ─── Session manager (module-level, one session per callId) ──────────────────

const activeSessions = new Map<string, GeminiLiveSession>();

export async function openGeminiSession(
  callId: string,
  onResponse: (callId: string, response: GeminiResponse) => void
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("[Gemini] GEMINI_API_KEY is not set");

  if (activeSessions.has(callId)) {
    console.warn(`[Gemini] Session already exists for callId: ${callId} — skipping`);
    return;
  }

  const session = new GeminiLiveSession(apiKey, (response) => {
    onResponse(callId, response);
  });

  activeSessions.set(callId, session);

  await session.open();
  console.log(
    `[Gemini] Session opened — callId: ${callId} | active sessions: ${activeSessions.size}`
  );
}

export function sendAudioToGemini(callId: string, pcm16kBuffer: Buffer): void {
  const session = activeSessions.get(callId);
  if (!session) {
    console.warn(`[Gemini] No session for callId: ${callId}`);
    return;
  }
  session.sendAudio(pcm16kBuffer);
}

export function closeGeminiSession(callId: string): void {
  const session = activeSessions.get(callId);
  if (!session) return;
  session.close();
  activeSessions.delete(callId);
  console.log(
    `[Gemini] Session closed — callId: ${callId} | active sessions: ${activeSessions.size}`
  );
}

export function getActiveSessionCount(): number {
  return activeSessions.size;
}
