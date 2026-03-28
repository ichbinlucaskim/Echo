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
