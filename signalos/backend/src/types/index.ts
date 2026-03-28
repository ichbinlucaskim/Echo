export type CallStatus = "ACTIVE" | "ON-HOLD" | "ALERT";
export type AnomalyType = "WHISPER" | "STROKE" | "DISTRESS_SOUND";

export interface CallState {
  callId: string;
  status: CallStatus;
  transcript: string;
  startedAt: Date;
}

export interface AlertPayload {
  callId: string;
  anomalyType: AnomalyType;
  confidence: number;
  transcript: string;
  suggestedResponse: string;
  timestamp: Date;
}

export interface BroadcastMessage {
  type: "STATE_UPDATE" | "ALERT";
  payload: CallState | AlertPayload;
}
