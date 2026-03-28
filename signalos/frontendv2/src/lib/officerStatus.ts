/**
 * Officer status — shared by DispatchList badges and map markers.
 * Tailwind text-*-400 / border-*-500 align with default theme.
 */

export type OfficerStatus = "available" | "busy" | "critical" | "unavailable";

/** Badge classes matching dispatch list (text color = pin fill on map). */
export const OFFICER_STATUS_BADGE_CLASSES: Record<OfficerStatus, string> = {
  available:
    "bg-green-500/20 text-green-400 border border-green-500/30",
  busy: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border border-red-500/30",
  unavailable:
    "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

/** Pin fill = same as badge text-*-400; stroke ≈ border-*-500 for contrast on map. */
const PIN_COLORS: Record<
  OfficerStatus,
  { fill: string; stroke: string }
> = {
  available: { fill: "#4ade80", stroke: "#22c55e" }, // green-400 / green-500
  busy: { fill: "#facc15", stroke: "#eab308" }, // yellow-400 / yellow-500
  critical: { fill: "#f87171", stroke: "#ef4444" }, // red-400 / red-500
  unavailable: { fill: "#9ca3af", stroke: "#6b7280" }, // gray-400 / gray-500
};

function normalizeKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/[-_\s]/g, "");
}

/** Map DB / legacy strings to the four canonical statuses. */
export function normalizeOfficerStatus(raw: string): OfficerStatus {
  const key = normalizeKey(raw);
  if (key === "available") return "available";
  if (key === "busy") return "busy";
  if (key === "critical") return "critical";
  if (
    key === "unavailable" ||
    key === "nonavailable" ||
    key === "unavilable"
  ) {
    return "unavailable";
  }
  return "unavailable";
}

/** Data URL for Google Maps Marker.icon — matches dispatch list text colors. */
export function officerMarkerIconDataUrl(status: string): string {
  const s = normalizeOfficerStatus(status);
  const { fill, stroke } = PIN_COLORS[s];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/></svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}
