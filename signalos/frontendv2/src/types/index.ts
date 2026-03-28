export type CallStatus = "ACTIVE" | "ON-HOLD" | "ALERT" | "ROUTED";
export type AnomalyType = "WHISPER" | "STROKE" | "DISTRESS_SOUND";
export type CallCategory =
  | "MONITORING"
  | "NON_EMERGENCY"
  | "MEDICAL"
  | "TRAFFIC"
  | "FIRE_HAZARD"
  | "CRIME"
  | "SILENT_DISTRESS";

export interface CallState {
  callId: string;
  status: CallStatus;
  transcript: string;
  startedAt: Date;
  category: CallCategory;
  categorySummary: string;
  categoryConfidence: number;
  muted: boolean;
  onHold: boolean;
}

export interface AlertPayload {
  callId: string;
  anomalyType: AnomalyType;
  confidence: number;
  transcript: string;
  suggestedResponse: string;
  timestamp: Date;
}

export interface AudioChunkPayload {
  callId: string;
  mimeType: string;
  data: string;
}

export type BroadcastMessage =
  | { type: "STATE_UPDATE"; payload: CallState }
  | { type: "ALERT"; payload: AlertPayload }
  | { type: "AUDIO_CHUNK"; payload: AudioChunkPayload }
  | { type: "CALL_ENDED"; payload: { callId: string } }
  | { type: "SELECTION_UPDATE"; payload: { callId: string | null } };

/** Commands: dashboard WebSocket → backend (same shape as server). */
export type DashboardCommand =
  | { type: "SET_MUTE"; callId: string; muted: boolean }
  | { type: "SET_HOLD"; callId: string; onHold: boolean }
  | { type: "END_CALL"; callId: string }
  | { type: "SELECT_CALL"; callId: string | null }
  | { type: "ROUTE_NON_EMERGENCY"; callId: string };
