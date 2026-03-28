import { WebSocket } from "ws";
import { BroadcastMessage } from "./types";

const dashboardClients = new Set<WebSocket>();

export function addDashboardClient(ws: WebSocket): void {
  dashboardClients.add(ws);
  ws.on("close", () => {
    dashboardClients.delete(ws);
  });
}

export function broadcast(message: BroadcastMessage): void {
  const serialized = JSON.stringify(message);
  for (const client of dashboardClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}

export function getDashboardClientCount(): number {
  return dashboardClients.size;
}
