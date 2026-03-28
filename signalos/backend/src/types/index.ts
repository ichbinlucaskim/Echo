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
  /** When true, inbound audio is not sent to Gemini; AI audio is not sent to dashboard. */
  muted: boolean;
  /** When true, same processing pause as mute; status may be ON-HOLD. Optional Twilio redirect if env URLs set. */
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
  data: string; // base64-encoded PCM
}

export type BroadcastMessage =
  | { type: "STATE_UPDATE"; payload: CallState }
  | { type: "ALERT"; payload: AlertPayload }
  | { type: "AUDIO_CHUNK"; payload: AudioChunkPayload }
  | { type: "CALL_ENDED"; payload: { callId: string } };
