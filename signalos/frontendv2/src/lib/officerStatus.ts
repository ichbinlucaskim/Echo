/**
 * Officer status — shared by DispatchList badges and map markers.
 * Tailwind classes for badges live here; `tailwind.config` must include `./src/lib/**`
 * so JIT picks up `text-green-400`, etc.
 */

export type OfficerStatus = "available" | "busy" | "critical" | "unavailable";

/** Badge classes matching dispatch list. */
export const OFFICER_STATUS_BADGE_CLASSES: Record<OfficerStatus, string> = {
  available:
    "bg-green-500/20 text-green-400 border border-green-500/30",
  busy: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border border-red-500/30",
  unavailable:
    "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

/** Same CDN + size as active-call pins (`blue-dot.png`) in GoogleMapBackground. */
const GOOGLE_MS_ICONS = "https://maps.google.com/mapfiles/ms/icons";

function normalizeKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/[-_\s]/g, "");
}

/**
 * Map DB / legacy strings to the four canonical statuses.
 * Treat common synonyms as `available` so the green badge applies.
 */
export function normalizeOfficerStatus(raw: string): OfficerStatus {
  const key = normalizeKey(raw);
  if (
    key === "available" ||
    key === "active" ||
    key === "free" ||
    key === "idle" ||
    key === "ready" ||
    key === "onduty" ||
    key === "oncall"
  ) {
    return "available";
  }
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

/**
 * Google Maps default colored pins — same silhouette as `blue-dot.png` (slim teardrop + small center dot).
 */
export function officerGoogleMapsPinUrl(status: string): string {
  const s = normalizeOfficerStatus(status);
  switch (s) {
    case "available":
      return `${GOOGLE_MS_ICONS}/green-dot.png`;
    case "busy":
      return `${GOOGLE_MS_ICONS}/yellow-dot.png`;
    case "critical":
      return `${GOOGLE_MS_ICONS}/red-dot.png`;
    case "unavailable": {
      // No official gray *-dot.png in ms/icons; match green/yellow/red silhouette + small dark center dot.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 32"><path fill="#9ca3af" stroke="#6b7280" stroke-width="1" stroke-linejoin="round" d="M12 2C7.58 2 4 5.58 4 10c0 8 8 21 8 21s8-13 8-21c0-4.42-3.58-8-8-8z"/><circle cx="12" cy="10" r="2" fill="#171717"/></svg>`;
      return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
    }
    default:
      return `${GOOGLE_MS_ICONS}/ltblue-dot.png`;
  }
}
