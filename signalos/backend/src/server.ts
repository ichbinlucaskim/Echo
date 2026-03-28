import http from "http";
import { WebSocketServer, WebSocket, RawData } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import { addDashboardClient, getDashboardClientCount, broadcast } from "./broadcaster";
import {
  createSession,
  deleteSession,
  appendTranscript,
  markAlert,
  updateCategory,
  markRouted,
  getAllSessions,
} from "./stateManager";
import {
  openGeminiSession,
  sendAudioToGemini,
  closeGeminiSession,
  getActiveSessionCount,
  GeminiResponse,
} from "./gemini";
import { twilioChunkToGeminiAudio } from "./utils/transcode";
import { AlertPayload, AnomalyType, CallCategory } from "./types";

dotenv.config();

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const MAX_SESSIONS = 6;
const CONFIDENCE_THRESHOLD = 0.85;
const VALID_ANOMALY_TYPES: ReadonlySet<string> = new Set([
  "WHISPER",
  "STROKE",
  "DISTRESS_SOUND",
]);

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "NON_EMERGENCY",
  "MEDICAL",
  "TRAFFIC",
  "FIRE_HAZARD",
  "CRIME",
  "SILENT_DISTRESS",
]);

// ─── HTTP server (required by Railway health checks) ─────────────────────────

const httpServer = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.method === "POST" && req.url === "/route-non-emergency") {
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body) as { callId?: unknown };
          const callId = parsed.callId;
          if (typeof callId !== "string" || !callId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "callId is required" }));
            return;
          }
          const updated = markRouted(callId);
          if (!updated) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Session not found" }));
            return;
          }
          broadcast({ type: "STATE_UPDATE", payload: updated });
          console.log(`[Route] callId: ${callId} routed to non-emergency`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("SignalOS backend is running\n");
  }
);

// ─── WebSocket servers (noServer — we route manually via upgrade event) ──────

const twilioWss = new WebSocketServer({ noServer: true });
const dashboardWss = new WebSocketServer({ noServer: true });

httpServer.on(
  "upgrade",
  (request: IncomingMessage, socket: import("net").Socket, head: Buffer) => {
    const url = request.url ?? "";

    if (url === "/twilio") {
      twilioWss.handleUpgrade(request, socket, head, (ws) => {
        twilioWss.emit("connection", ws, request);
      });
    } else if (url === "/dashboard") {
      dashboardWss.handleUpgrade(request, socket, head, (ws) => {
        dashboardWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  }
);

// ─── Gemini response handler ──────────────────────────────────────────────────

function onGeminiResponse(callId: string, response: GeminiResponse): void {
  if (response.type === "text") {
    console.log(`[Gemini→State] Text for callId: ${callId} — "${response.text}"`);
    const updated = appendTranscript(callId, response.text);
    if (updated) {
      broadcast({ type: "STATE_UPDATE", payload: updated });
    }
    return;
  }

  if (response.type === "functionCall") {
    if (response.name === "categorizeCall") {
      const { category, confidence, summary } = response.args;

      if (
        typeof category !== "string" ||
        !VALID_CATEGORIES.has(category) ||
        typeof confidence !== "number" ||
        typeof summary !== "string"
      ) {
        console.warn(
          `[Category] Invalid categorizeCall args for callId: ${callId}`,
          response.args
        );
        return;
      }

      console.log(
        `[Category] categorizeCall fired — callId: ${callId} | category: ${category} | confidence: ${(confidence * 100).toFixed(0)}% | summary: "${summary}"`
      );

      const updatedState = updateCategory(
        callId,
        category as CallCategory,
        summary
      );
      if (updatedState) {
        broadcast({ type: "STATE_UPDATE", payload: updatedState });
      }

      if (category === "SILENT_DISTRESS") {
        console.log(
          `[SILENT DISTRESS] callId: ${callId} | confidence: ${(confidence * 100).toFixed(0)}% | summary: "${summary}"`
        );
        const alertPayload: AlertPayload = {
          callId,
          anomalyType: "WHISPER",
          confidence,
          transcript: summary,
          suggestedResponse:
            "Silent Distress detected — dispatcher attention required",
          timestamp: new Date(),
        };
        markAlert(callId, alertPayload);
        broadcast({ type: "ALERT", payload: alertPayload });
      }
      return;
    }

    if (response.name !== "triggerAlert") {
      console.warn(
        `[Alert] Unknown function call: ${response.name} for callId: ${callId} — ignoring`
      );
      return;
    }

    const { anomalyType, confidence, transcript, suggestedResponse } =
      response.args;

    // Runtime type guards — args arrive as Record<string, unknown>
    if (
      typeof anomalyType !== "string" ||
      !VALID_ANOMALY_TYPES.has(anomalyType) ||
      typeof confidence !== "number" ||
      typeof transcript !== "string" ||
      typeof suggestedResponse !== "string"
    ) {
      console.warn(
        `[Alert] Invalid triggerAlert args for callId: ${callId}`,
        response.args
      );
      return;
    }

    // Belt-and-suspenders confidence guard (system prompt also enforces 85%)
    if (confidence < CONFIDENCE_THRESHOLD) {
      console.warn(
        `[Alert] triggerAlert confidence too low (${(confidence * 100).toFixed(0)}%) for callId: ${callId} — ignoring`
      );
      return;
    }

    const alertPayload: AlertPayload = {
      callId,
      anomalyType: anomalyType as AnomalyType,
      confidence,
      transcript,
      suggestedResponse,
      timestamp: new Date(),
    };

    console.log(
      `[ALERT] triggerAlert fired — callId: ${callId} | type: ${anomalyType} | confidence: ${(confidence * 100).toFixed(0)}% | transcript: "${transcript}"`
    );

    markAlert(callId, alertPayload);
    broadcast({ type: "ALERT", payload: alertPayload });
  }
}

// ─── Twilio Media Stream message types ───────────────────────────────────────

interface TwilioConnectedEvent {
  event: "connected";
  protocol: string;
  version: string;
}

interface TwilioStartEvent {
  event: "start";
  sequenceNumber: string;
  streamSid: string;
  start: {
    accountSid: string;
    streamSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
}

interface TwilioMediaEvent {
  event: "media";
  sequenceNumber: string;
  streamSid: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64-encoded μ-law 8kHz PCM
  };
}

interface TwilioStopEvent {
  event: "stop";
  sequenceNumber: string;
  streamSid: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
}

type TwilioMessage =
  | TwilioConnectedEvent
  | TwilioStartEvent
  | TwilioMediaEvent
  | TwilioStopEvent;

// ─── Twilio /twilio handler ──────────────────────────────────────────────────

twilioWss.on("connection", (ws: WebSocket) => {
  
  // Session limit guard — reject if already at capacity
  const currentSessions = getActiveSessionCount();
  if (currentSessions >= MAX_SESSIONS) {
    console.warn(
      `[Twilio] Session limit reached (${currentSessions}/${MAX_SESSIONS}) — rejecting connection`
    );
    ws.close(1008, "Session limit reached");
    return;
  }

  let callId: string | null = null;
  let firstChunkLogged = false;

  console.log("[Twilio] New connection established");

  ws.on("message", (raw: RawData) => {
    let message: TwilioMessage;

    try {
      const text =
        typeof raw === "string"
          ? raw
          : Buffer.from(raw as ArrayBuffer).toString("utf-8");
      message = JSON.parse(text) as TwilioMessage;
    } catch (err) {
      console.error("[Twilio] Failed to parse message:", err);
      return;
    }

    switch (message.event) {
      case "connected":
        console.log(
          `[Twilio] Media stream protocol connected — version: ${message.version}`
        );
        break;

      case "start":
        callId = message.start.callSid;
        console.log(
          `[Twilio] Stream started — callId: ${callId} | streamSid: ${message.streamSid} | encoding: ${message.start.mediaFormat.encoding} @ ${message.start.mediaFormat.sampleRate}Hz`
        );
        const initialState = createSession(callId);
        broadcast({ type: "STATE_UPDATE", payload: initialState });
        openGeminiSession(callId, onGeminiResponse).catch((err: Error) => {
          console.error(
            `[Gemini] Failed to open session for callId: ${callId} — ${err.message}`
          );
        });
        break;

      case "media": {
        if (!callId) break;

        const audioPayload: string | undefined = message.media?.payload;
        if (!audioPayload) {
          console.warn(
            `[Twilio] Media event missing payload — callId: ${callId}`
          );
          break;
        }

        if (!firstChunkLogged) {
          console.log(
            `[Twilio] First audio chunk received — callId: ${callId} | payload length: ${audioPayload.length} bytes (base64 μ-law 8kHz) | chunk: ${message.media.chunk}`
          );
          firstChunkLogged = true;
        }

        const pcm16k = twilioChunkToGeminiAudio(audioPayload);
        sendAudioToGemini(callId, pcm16k);
        break;
      }

      case "stop":
        console.log(
          `[Twilio] Stream stopped — callId: ${callId ?? message.stop.callSid}`
        );
        if (callId) {
          closeGeminiSession(callId);
          deleteSession(callId);
          callId = null;
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log(`[Twilio] Connection closed — callId: ${callId ?? "unknown"}`);
    if (callId) {
      closeGeminiSession(callId);
      deleteSession(callId);
      callId = null;
    }
  });

  ws.on("error", (err: Error) => {
    console.error(
      `[Twilio] Socket error — callId: ${callId ?? "unknown"}: ${err.message}`
    );
  });
});

// ─── Dashboard /dashboard handler ────────────────────────────────────────────

dashboardWss.on("connection", (ws: WebSocket) => {
  console.log(
    `[Dashboard] Frontend client connected — total clients: ${getDashboardClientCount() + 1}`
  );
  addDashboardClient(ws);

  // Catch up: Twilio may have started calls before the dashboard connected
  for (const state of getAllSessions()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "STATE_UPDATE", payload: state }));
    }
  }

  ws.on("close", () => {
    console.log(
      `[Dashboard] Frontend client disconnected — remaining clients: ${getDashboardClientCount()}`
    );
  });

  ws.on("error", (err: Error) => {
    console.error("[Dashboard] Socket error:", err.message);
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[SignalOS] Backend running on port ${PORT}`);
  console.log(`[SignalOS] Twilio endpoint   → ws://localhost:${PORT}/twilio`);
  console.log(`[SignalOS] Dashboard endpoint → ws://localhost:${PORT}/dashboard`);
});
