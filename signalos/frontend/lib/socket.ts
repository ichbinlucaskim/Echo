import { BroadcastMessage } from "../types";

let socket: WebSocket | null = null;

export function connectToBackend(
  onMessage: (message: BroadcastMessage) => void,
  onClose?: () => void
): WebSocket {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:3001/dashboard";

  socket = new WebSocket(backendUrl);

  socket.onopen = (): void => {
    console.log("[Socket] Connected to SignalOS backend");
  };

  socket.onmessage = (event: MessageEvent<string>): void => {
    try {
      const message = JSON.parse(event.data) as BroadcastMessage;
      onMessage(message);
    } catch (err) {
      console.error("[Socket] Failed to parse message:", err);
    }
  };

  socket.onclose = (): void => {
    console.log("[Socket] Disconnected from backend");
    onClose?.();
  };

  socket.onerror = (error: Event): void => {
    console.error("[Socket] Connection error:", error);
  };

  return socket;
}

export function disconnectFromBackend(): void {
  socket?.close();
  socket = null;
}
