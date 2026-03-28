import { CallState, CallStatus } from "./types";

const sessions = new Map<string, CallState>();

export function createSession(callId: string): CallState {
  const state: CallState = {
    callId,
    status: "ACTIVE" as CallStatus,
    transcript: "",
    startedAt: new Date(),
  };
  sessions.set(callId, state);
  console.log(`[StateManager] Session created — callId: ${callId} | total sessions: ${sessions.size}`);
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

export function deleteSession(callId: string): void {
  sessions.delete(callId);
  console.log(`[StateManager] Session deleted — callId: ${callId} | total sessions: ${sessions.size}`);
}

export function getSessionCount(): number {
  return sessions.size;
}

export function getAllSessions(): CallState[] {
  return Array.from(sessions.values());
}
