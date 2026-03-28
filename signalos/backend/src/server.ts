import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import { addDashboardClient, getDashboardClientCount } from "./broadcaster";
import { createSession, deleteSession } from "./stateManager";

dotenv.config();

const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─── HTTP server (required by Railway health checks) ─────────────────────────

const httpServer = http.createServer(
  (_req: http.IncomingMessage, res: http.ServerResponse) => {
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
  let callId: string | null = null;
  let firstChunkLogged = false;

  console.log("[Twilio] New connection established");

  ws.on("message", (raw: Buffer) => {
    let message: TwilioMessage;

    try {
      message = JSON.parse(raw.toString()) as TwilioMessage;
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
        createSession(callId);
        break;

      case "media":
        if (!firstChunkLogged) {
          console.log(
            `[Twilio] First audio chunk received — callId: ${callId} | payload length: ${message.media.payload.length} bytes (base64 μ-law 8kHz) | chunk: ${message.media.chunk}`
          );
          firstChunkLogged = true;
        }
        // Sprint 2: decode + transcode + pipe to GeminiLiveSession here
        break;

      case "stop":
        console.log(
          `[Twilio] Stream stopped — callId: ${callId ?? message.stop.callSid}`
        );
        if (callId) {
          deleteSession(callId);
          callId = null;
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log(`[Twilio] Connection closed — callId: ${callId ?? "unknown"}`);
    if (callId) {
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
