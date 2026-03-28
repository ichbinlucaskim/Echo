import { CallState, CallStatus, CallCategory, AlertPayload } from "./types";

const sessions = new Map<string, CallState>();
let selectedCallId: string | null = null;

export function getSelectedCallId(): string | null {
  return selectedCallId;
}

export function setSelectedCallId(callId: string | null): string | null {
  selectedCallId = callId;
  console.log(`[StateManager] Selection updated — callId: ${callId}`);
  return selectedCallId;
}

export function createSession(callId: string): CallState {
  const state: CallState = {
    callId,
    status: "ACTIVE" as CallStatus,
    transcript: "",
    startedAt: new Date(),
    category: "MONITORING",
    categorySummary: "",
    categoryConfidence: 0,
    muted: false,
    onHold: false,
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

// Marks a session as ALERT. Preserves the caller's raw transcript.
// Returns the updated CallState, or null if the session doesn't exist.
export function markAlert(
  callId: string,
  _alert: AlertPayload
): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;

  const updated: CallState = {
    ...existing,
    status: "ALERT",
  };
  sessions.set(callId, updated);
  return updated;
}

export function updateCategory(
  callId: string,
  category: CallCategory,
  categorySummary: string,
  categoryConfidence: number
): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;
  const updated: CallState = { ...existing, category, categorySummary, categoryConfidence };
  sessions.set(callId, updated);
  return updated;
}

export function markRouted(callId: string): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;
  const updated: CallState = {
    ...existing,
    status: "ROUTED",
  };
  sessions.set(callId, updated);
  return updated;
}

export function setMuted(callId: string, muted: boolean): CallState | null {
  return updateSession(callId, { muted });
}

export function setCallHold(callId: string, onHold: boolean): CallState | null {
  const existing = sessions.get(callId);
  if (!existing) return null;

  if (onHold) {
    if (existing.status === "ACTIVE") {
      return updateSession(callId, { status: "ON-HOLD", onHold: true });
    }
    return updateSession(callId, { onHold: true });
  }

  if (existing.status === "ON-HOLD") {
    return updateSession(callId, { status: "ACTIVE", onHold: false });
  }
  return updateSession(callId, { onHold: false });
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
