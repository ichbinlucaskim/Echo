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
  getSession,
  setMuted,
  setCallHold,
  getSelectedCallId,
  setSelectedCallId,
} from "./stateManager";
import { hangupCall, redirectCall } from "./twilioVoice";
import {
  openGeminiSession,
  sendAudioToGemini,
  closeGeminiSession,
  getActiveSessionCount,
  GeminiResponse,
} from "./gemini";
import { twilioChunkToGeminiAudio } from "./utils/transcode";
import { AlertPayload, AnomalyType, CallCategory } from "./types";
import { saveCallLog } from "./callLogger";

dotenv.config();

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const MAX_SESSIONS = 6;
const CONFIDENCE_THRESHOLD = 0.85;
const VALID_ANOMALY_TYPES: ReadonlySet<string> = new Set([
  "WHISPER",
  "STROKE",
  "DISTRESS_SOUND",
]);

const CALLER_NAMES: Record<string, string> = {
  sim_call_1: "Monica Schmidt",
  sim_call_2: "James Anderson",
  sim_call_3: "Sofia Patel",
  sim_call_4: "Carlos Rodriguez",
};
const DEFAULT_CALLER_NAME = "Liam Thompson";

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
  if (response.type === "audio") {
    const session = getSession(callId);
    if (!session) return;
    if (session.muted || session.onHold) return;

    // Gemini speaking means it detected a critical anomaly (per system prompt,
    // the ONLY reason it speaks is "Urgent caller: <name>").
    // Only escalate if the call is already categorized as high-severity;
    // non-emergency calls (e.g. broken street light) should not trigger alerts
    // even if Gemini produces spurious audio.
    const ALERT_ELIGIBLE: ReadonlySet<string> = new Set([
      "MEDICAL", "CRIME", "FIRE_HAZARD", "SILENT_DISTRESS",
    ]);
    if (session.status !== "ALERT" && ALERT_ELIGIBLE.has(session.category)) {
      console.log(`[ALERT] Gemini spoke audio for callId: ${callId} (category: ${session.category}) — triggering alert`);
      const callerName = CALLER_NAMES[callId] ?? DEFAULT_CALLER_NAME;
      const alertPayload: AlertPayload = {
        callId,
        anomalyType: "DISTRESS_SOUND",
        confidence: 0.9,
        transcript: session.transcript || `Gemini detected critical situation for ${callerName}`,
        suggestedResponse: "Dispatcher attention required — Gemini flagged this call",
        timestamp: new Date(),
      };
      markAlert(callId, alertPayload);
      broadcast({ type: "STATE_UPDATE", payload: { ...session, status: "ALERT" } });
      broadcast({ type: "ALERT", payload: alertPayload });
    } else if (session.status !== "ALERT") {
      console.log(`[Gemini] Audio ignored for callId: ${callId} — category "${session.category}" is not alert-eligible`);
    }

    broadcast({
      type: "AUDIO_CHUNK",
      payload: {
        callId,
        mimeType: response.mimeType,
        data: response.data,
      },
    });
    return;
  }

  if (response.type === "transcription") {
    const label = response.source === "input" ? "Caller" : "AI";
    console.log(`[Gemini→Transcript] ${label} for callId: ${callId} — "${response.text}"`);
    // Only append caller speech to the transcript, not Gemini output
    if (response.source === "input") {
      const updated = appendTranscript(callId, response.text);
      if (updated) {
        broadcast({ type: "STATE_UPDATE", payload: updated });
      }
    }
    return;
  }

  if (response.type === "text") {
    // Log Gemini text but don't add it to the caller transcript
    console.log(`[Gemini→State] Text for callId: ${callId} — "${response.text}"`);
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
        summary,
        confidence
      );
      if (updatedState) {
        broadcast({ type: "STATE_UPDATE", payload: updatedState });
      }

      // Auto-trigger alert for high-severity categories
      const ALERT_CATEGORIES: Record<string, { anomalyType: AnomalyType; label: string }> = {
        SILENT_DISTRESS: { anomalyType: "WHISPER", label: "Silent Distress" },
        CRIME: { anomalyType: "DISTRESS_SOUND", label: "Crime" },
        FIRE_HAZARD: { anomalyType: "DISTRESS_SOUND", label: "Fire Hazard" },
        MEDICAL: { anomalyType: "STROKE", label: "Medical Emergency" },
      };

      const alertInfo = ALERT_CATEGORIES[category];
      if (alertInfo && confidence >= 0.5) {
        console.log(
          `[ALERT] ${alertInfo.label} callId: ${callId} | confidence: ${(confidence * 100).toFixed(0)}% | summary: "${summary}"`
        );
        const session = getSession(callId);
        const alertPayload: AlertPayload = {
          callId,
          anomalyType: alertInfo.anomalyType,
          confidence,
          transcript: session?.transcript || summary,
          suggestedResponse:
            `${alertInfo.label} detected — dispatcher attention required`,
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

    const session = getSession(callId);
    const alertPayload: AlertPayload = {
      callId,
      anomalyType: anomalyType as AnomalyType,
      confidence,
      transcript: session?.transcript || transcript,
      suggestedResponse,
      timestamp: new Date(),
    };

    console.log(
      `[ALERT] triggerAlert fired — callId: ${callId} | type: ${anomalyType} | confidence: ${(confidence * 100).toFixed(0)}% | transcript: "${alertPayload.transcript}"`
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
        const callerName = CALLER_NAMES[callId] ?? DEFAULT_CALLER_NAME;
        openGeminiSession(callId, callerName, onGeminiResponse).catch((err: Error) => {
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

        const session = getSession(callId);
        // Session gone (e.g. dashboard END_CALL) but simulator/Twilio may still send media — ignore.
        if (!session) {
          break;
        }
        if (session.muted || session.onHold) {
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
          const endedSession = getSession(callId);
          if (endedSession) void saveCallLog(endedSession);
          closeGeminiSession(callId);
          deleteSession(callId);
          broadcast({ type: "CALL_ENDED", payload: { callId } });
          callId = null;
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log(`[Twilio] Connection closed — callId: ${callId ?? "unknown"}`);
    if (callId) {
      const ended = callId;
      const endedSession = getSession(ended);
      if (endedSession) void saveCallLog(endedSession);
      closeGeminiSession(ended);
      deleteSession(ended);
      broadcast({ type: "CALL_ENDED", payload: { callId: ended } });
      callId = null;
    }
  });

  ws.on("error", (err: Error) => {
    console.error(
      `[Twilio] Socket error — callId: ${callId ?? "unknown"}: ${err.message}`
    );
  });
});

// ─── Dashboard inbound (mute / hold / end) ───────────────────────────────────

type DashboardInbound =
  | { type: "SET_MUTE"; callId: string; muted: boolean }
  | { type: "SET_HOLD"; callId: string; onHold: boolean }
  | { type: "END_CALL"; callId: string }
  | { type: "SELECT_CALL"; callId: string | null }
  | { type: "ROUTE_NON_EMERGENCY"; callId: string };

function parseDashboardInbound(data: unknown): DashboardInbound | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.type !== "string") return null;
  // SELECT_CALL allows null callId (deselect); all others require a string callId
  if (o.type === "SELECT_CALL") {
    return { type: "SELECT_CALL", callId: typeof o.callId === "string" ? o.callId : null };
  }
  if (typeof o.callId !== "string" || !o.callId) {
    return null;
  }
  switch (o.type) {
    case "SET_MUTE":
      if (typeof o.muted !== "boolean") return null;
      return { type: "SET_MUTE", callId: o.callId, muted: o.muted };
    case "SET_HOLD":
      if (typeof o.onHold !== "boolean") return null;
      return { type: "SET_HOLD", callId: o.callId, onHold: o.onHold };
    case "END_CALL":
      return { type: "END_CALL", callId: o.callId };
    case "ROUTE_NON_EMERGENCY":
      return { type: "ROUTE_NON_EMERGENCY", callId: o.callId };
    default:
      return null;
  }
}

function handleDashboardCommand(raw: RawData): void {
  let parsed: unknown;
  try {
    const text =
      typeof raw === "string"
        ? raw
        : Buffer.from(raw as ArrayBuffer).toString("utf-8");
    parsed = JSON.parse(text);
  } catch {
    return;
  }
  const cmd = parseDashboardInbound(parsed);
  if (!cmd) return;

  switch (cmd.type) {
    case "SET_MUTE": {
      const updated = setMuted(cmd.callId, cmd.muted);
      if (updated) broadcast({ type: "STATE_UPDATE", payload: updated });
      break;
    }
    case "SET_HOLD": {
      const updated = setCallHold(cmd.callId, cmd.onHold);
      if (updated) {
        broadcast({ type: "STATE_UPDATE", payload: updated });
        const holdUrl = process.env.TWILIO_HOLD_TWIML_URL?.trim();
        const resumeUrl = process.env.TWILIO_RESUME_TWIML_URL?.trim();
        if (cmd.onHold && holdUrl) {
          void redirectCall(cmd.callId, holdUrl);
        } else if (!cmd.onHold && resumeUrl) {
          void redirectCall(cmd.callId, resumeUrl);
        }
      }
      break;
    }
    case "END_CALL": {
      void (async () => {
        const endedSession = getSession(cmd.callId);
        if (endedSession) await saveCallLog(endedSession);
        await hangupCall(cmd.callId);
        closeGeminiSession(cmd.callId);
        deleteSession(cmd.callId);
        broadcast({ type: "CALL_ENDED", payload: { callId: cmd.callId } });
        // Clear selection if the ended call was selected
        if (getSelectedCallId() === cmd.callId) {
          setSelectedCallId(null);
          broadcast({ type: "SELECTION_UPDATE", payload: { callId: null } });
        }
      })();
      break;
    }
    case "SELECT_CALL": {
      setSelectedCallId(cmd.callId);
      broadcast({ type: "SELECTION_UPDATE", payload: { callId: cmd.callId } });
      break;
    }
    case "ROUTE_NON_EMERGENCY": {
      const routed = markRouted(cmd.callId);
      if (routed) {
        console.log(`[Route] callId: ${cmd.callId} manually routed to non-emergency`);
        broadcast({ type: "STATE_UPDATE", payload: routed });
      }
      break;
    }
  }
}

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
  // Send current selection state
  const currentSelection = getSelectedCallId();
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "SELECTION_UPDATE", payload: { callId: currentSelection } }));
  }

  ws.on("message", (raw: RawData) => {
    handleDashboardCommand(raw);
  });

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
