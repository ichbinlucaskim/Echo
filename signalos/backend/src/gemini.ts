import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

const GEMINI_MODEL = "models/gemini-2.0-flash-live-001";

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

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly onResponse: (raw: string) => void;
  private setupComplete = false;

  constructor(apiKey: string, onResponse: (raw: string) => void) {
    this.apiKey = apiKey;
    this.onResponse = onResponse;
  }

  open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = `${GEMINI_LIVE_WS_URL}?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        console.log("[Gemini] WebSocket connection opened — sending setup");
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
          console.warn("[Gemini] Non-JSON message received:", text);
          return;
        }

        if (!this.setupComplete && "setupComplete" in parsed) {
          console.log("[Gemini] Setup acknowledged — session ready to accept audio");
          this.setupComplete = true;
          resolve();
          return;
        }

        this.onResponse(text);
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[Gemini] Cannot send audio — session not open");
      return;
    }

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
