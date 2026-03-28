import { CallState, CallStatus, CallCategory, AlertPayload } from "./types";

const sessions = new Map<string, CallState>();

export function createSession(callId: string): CallState {
  const state: CallState = {
    callId,
    status: "ACTIVE" as CallStatus,
    transcript: "",
    startedAt: new Date(),
    category: "MONITORING",
    categorySummary: "",
  };
  sessions.set(callId, state);
  console.log(
    `[StateManager] Session created — callId: ${callId} | total sessions: ${sessions.size}`
  );
  return state;
}

export function getSession(callId: string): CallState | undefined {
  return sessions.get(callId);
}

export function updateSession(
  callId: string,
  updates: Partial<Omit<CallState, "callId">>
): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;
  const updated: CallState = { ...existing, ...updates };
  sessions.set(callId, updated);
  return updated;
}

// Appends a Gemini text chunk to the rolling transcript.
// Returns the updated CallState, or null if the session doesn't exist.
export function appendTranscript(
  callId: string,
  text: string
): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;

  const updated: CallState = {
    ...existing,
    transcript: existing.transcript
      ? `${existing.transcript} ${text}`
      : text,
  };
  sessions.set(callId, updated);
  return updated;
}

// Marks a session as ALERT and records the alert payload in the transcript.
// Returns the updated CallState, or null if the session doesn't exist.
export function markAlert(
  callId: string,
  alert: AlertPayload
): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;

  const updated: CallState = {
    ...existing,
    status: "ALERT",
    transcript: alert.transcript,
  };
  sessions.set(callId, updated);
  return updated;
}

export function updateCategory(
  callId: string,
  category: CallCategory,
  categorySummary: string
): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;
  const updated: CallState = { ...existing, category, categorySummary };
  sessions.set(callId, updated);
  return updated;
}

export function markRouted(callId: string): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;
  const updated: CallState = {
    ...existing,
    status: "ROUTED",
    category: "NON_EMERGENCY",
  };
  sessions.set(callId, updated);
  return updated;
}

export function deleteSession(callId: string): void {
  sessions.delete(callId);
  console.log(
    `[StateManager] Session deleted — callId: ${callId} | total sessions: ${sessions.size}`
  );
}

export function getSessionCount(): number {
  return sessions.size;
}

export function getAllSessions(): CallState[] {
  return Array.from(sessions.values());
}
