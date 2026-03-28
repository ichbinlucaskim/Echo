import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

const GEMINI_MODEL = "models/gemini-3.1-flash-live-preview";

// Load system prompt once at startup
const SYSTEM_PROMPT: string = fs
  .readFileSync(
    path.resolve(__dirname, "../../prompts/systemPrompt.txt"),
    "utf-8"
  )
  .trim();

// ─── Outbound message types ───────────────────────────────────────────────────

interface FunctionParameter {
  type: string;
  enum?: string[];
}

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, FunctionParameter>;
    required: string[];
  };
}

interface GeminiSetupMessage {
  setup: {
    model: string;
    systemInstruction?: {
      parts: Array<{ text: string }>;
    };
    tools?: Array<{
      functionDeclarations: FunctionDeclaration[];
    }>;
    /** JSON uses camelCase per https://ai.google.dev/api/live */
    generationConfig?: {
      responseModalities: string[];
    };
    /** Enable text transcripts alongside native audio */
    inputAudioTranscription?: Record<string, never>;
    outputAudioTranscription?: Record<string, never>;
  };
}

interface GeminiRealtimeInput {
  realtimeInput: {
    /** Prefer over deprecated mediaChunks */
    audio: {
      mimeType: string;
      data: string;
    };
  };
}

type GeminiOutboundMessage = GeminiSetupMessage | GeminiRealtimeInput;

// ─── triggerAlert function declaration ───────────────────────────────────────

const TRIGGER_ALERT_DECLARATION: FunctionDeclaration = {
  name: "triggerAlert",
  description: "Called when a critical anomaly is detected in the call audio",
  parameters: {
    type: "OBJECT",
    properties: {
      anomalyType: {
        type: "STRING",
        enum: ["WHISPER", "STROKE", "DISTRESS_SOUND"],
      },
      confidence: {
        type: "NUMBER",
      },
      transcript: {
        type: "STRING",
      },
      suggestedResponse: {
        type: "STRING",
      },
    },
    required: ["anomalyType", "confidence", "transcript", "suggestedResponse"],
  },
};

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
      console.log(`[Gemini] Connecting — model: ${GEMINI_MODEL}`);
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        const setup: GeminiSetupMessage = {
          setup: {
            model: GEMINI_MODEL,
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            tools: [
              {
                functionDeclarations: [TRIGGER_ALERT_DECLARATION],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
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
        if (!this.setupComplete) {
          if ("setupComplete" in parsed) {
            this.setupComplete = true;
            resolve();
            return;
          }
          console.warn(
            "[Gemini] Message before setupComplete:",
            JSON.stringify(parsed).slice(0, 800)
          );
          return;
        }

        // Content response
        const msg = parsed as GeminiServerMessage;
        const parts = msg.serverContent?.modelTurn?.parts ?? [];

        for (const part of parts) {
          if (
            "text" in part &&
            typeof part.text === "string" &&
            part.text.trim()
          ) {
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

      this.ws.on("close", (code: number, reason: Buffer) => {
        const why = reason?.length ? reason.toString("utf8") : "";
        console.log(
          `[Gemini] WebSocket closed — code: ${code}${why ? ` reason: ${why}` : ""}`
        );
        if (!this.setupComplete) {
          reject(
            new Error(
              `Gemini closed before setupComplete (code ${code})${why ? `: ${why}` : ""}`
            )
          );
        }
        this.setupComplete = false;
      });
    });
  }

  sendAudio(pcm16kBuffer: Buffer): void {
    if (!this.isReady()) return;

    const message: GeminiRealtimeInput = {
      realtimeInput: {
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: pcm16kBuffer.toString("base64"),
        },
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
    console.warn(
      `[Gemini] Session already exists for callId: ${callId} — skipping`
    );
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
