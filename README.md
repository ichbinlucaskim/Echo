# Echo:SignalOS

**Real-time AI monitoring layer for 911 on-hold calls.**

---

## The Problem

When a 911 dispatcher places a caller on hold, that line goes silent. No one is listening.

- **82%** of 911 centers are understaffed (NENA & Carbyne, 2023)
- **75%** of dispatchers report burnout
- **56%** report work-related anxiety in the past six months

A domestic violence victim who can only whisper, a stroke patient whose speech is slurring, a caller who has stopped responding entirely — none of these get flagged. Not from incompetence, but from cognitive overload. A dispatcher managing five simultaneous calls cannot monitor audio on a silent hold line.

SignalOS does.

---

## What It Does

SignalOS connects to every on-hold line simultaneously and streams audio to Gemini Live API in real time. When it detects a critical pattern — a whisper, slurred speech, a gasp — it fires a visual alert to the dispatcher's dashboard within seconds, before the window to respond closes.

- **Anomaly detection**: WHISPER · STROKE · DISTRESS_SOUND (≥85% confidence threshold)
- **Call categorization**: SILENT_DISTRESS · MEDICAL · TRAFFIC · FIRE_HAZARD · CRIME · NON_EMERGENCY
- **One-click non-emergency routing** from the dashboard
- **Incident report panel** auto-fills in real time from Gemini transcription
- **Up to 6 simultaneous streams**, each with full session isolation

---

## Architecture

```
                        ┌──────────────────────────────────────────────────────┐
                        │                   Railway (Backend)                  │
                        │                                                      │
 Phone Call             │   ┌──────────────┐    ┌───────────────────────────┐  │
     │                  │   │  server.ts   │    │        gemini.ts          │  │
     ▼                  │   │              │    │                           │  │
 Twilio Number          │   │  /twilio ────┼────▶  GeminiLiveSession        │  │
     │                  │   │  WebSocket   │    │  (one per callId)         │  │
     │ Media Stream     │   │              │    │                           │  │
     │ base64 μ-law     │   │  transcode() │    │  wss://generativelang-    │  │
     │ 8kHz · 160B/20ms │   │  ┌──────────┐│    │  uage.googleapis.com/ws/  │  │
     └──────────────────┼───▶  │μ-law 8kHz││    │  ...BidiGenerateContent   │  │
                        │   │  │→PCM 16kHz││    │  gemini-3.1-flash-live-   │  │
                        │   │  └──────────┘│    │  preview                  │  │
                        │   │              │    │                           │  │
                        │   │  Session     │    │  Function Calls:          │  │
                        │   │  limit: 6    │    │  ├─ triggerAlert()        │  │
                        │   │              │◀───┤  └─ categorizeCall()      │  │
                        │   └──────┬───────┘    └───────────────────────────┘  │
                        │          │                                           │
                        │   ┌──────▼───────┐    ┌───────────────────────────┐  │
                        │   │stateManager  │    │     broadcaster.ts        │  │
                        │   │              ├────▶                           │  │
                        │   │ Map<callId,  │    │  /dashboard WebSocket     │  │
                        │   │ CallState>   │    │  → all connected clients  │  │
                        │   └──────────────┘    └─────────────┬─────────────┘  │
                        │                                     │                │
                        │   POST /route-non-emergency ────────┘                │
                        └──────────────────────────────────────┼───────────────┘
                                                               │
                                       ┌───────────────────────▼───────────────────┐
                                       │              Vercel (Frontend)            │
                                       │                                           │
                                       │  useSignalOS() hook (auto-reconnect 3s)   │
                                       │  ├─ STATE_UPDATE → CallGrid               │
                                       │  │    category badge · transcript ·       │
                                       │  │    Route to Non-Emergency button       │
                                       │  └─ ALERT → AlertBanner + IncidentReport  │
                                       └───────────────────────────────────────────┘
```

**Per-chunk data flow (20ms cadence):**

1. Twilio sends `media` event — base64 μ-law 8kHz, 160 bytes
2. `transcode.ts` decodes μ-law → PCM 16-bit, upsamples 8kHz → 16kHz
3. PCM buffer forwarded to Gemini as `realtimeInput.audio` (`audio/pcm;rate=16000`) via `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
4. Gemini (`gemini-3.1-flash-live-preview`) returns text transcription and/or function calls
5. `triggerAlert` → `markAlert()` + `broadcast({ type: "ALERT" })`
6. `categorizeCall` → `updateCategory()` + `broadcast({ type: "STATE_UPDATE" })`
7. High-severity categories (SILENT_DISTRESS, CRIME, FIRE_HAZARD, MEDICAL) also fire an ALERT broadcast — dual detection path independent of `triggerAlert`

**End-of-call:** On Twilio `stop` event, `callLogger.ts` calls `saveCallLog()` — persists transcript, caller name, and phone number to Supabase `call_logs`. Runs fire-and-forget (`void`); missing env vars disable logging gracefully without crashing the session.

**Non-emergency routing:** `POST /route-non-emergency` sets a call's status to `ROUTED` and broadcasts a STATE_UPDATE, removing it from active monitoring.

**Simulator** — `npm run simulate` opens 4 concurrent streams (sim_call_1 through sim_call_4) using real WAV files at 8kHz: normal_call_1.wav, normal_call_2.wav, distress_test.wav, whisper_test.wav. Each stream sends 160-byte chunks at 20ms cadence with a 200ms stagger between starts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI | Gemini 3.1 Flash Live API · `gemini-3.1-flash-live-preview` |
| Audio streaming | `realtimeInput.audio` — native PCM, no buffering or transcription delay |
| Audio transcoding | `alawmulaw` npm package (μ-law decode + linear 2× upsampling) |
| Telephony | Twilio Media Streams (`<Stream>` TwiML verb) |
| Backend | Node.js 20 · TypeScript 5 · `ws` WebSocket library |
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Database | Supabase — `call_logs` table (call history) · `officers` table with realtime (frontendv2 map) |
| Backend hosting | Railway |
| Frontend hosting | Vercel |

---

## Detection & Categorization

### Anomaly Detection — `triggerAlert`

Fires at any point during a call when confidence ≥ 85%. Triggers a full-width red alert banner on the dashboard.

| Anomaly | Signal |
|---|---|
| `WHISPER` | Hushed or suppressed speech — caller cannot speak freely (domestic violence, intruder present) |
| `STROKE` | Slurred speech, word-finding difficulty, confused sentence structure |
| `DISTRESS_SOUND` | Gasping, crying, sounds of physical struggle, background alarms |

Payload:
```typescript
interface AlertPayload {
  callId: string;
  anomalyType: "WHISPER" | "STROKE" | "DISTRESS_SOUND";
  confidence: number;         // 0.85–1.0
  transcript: string;
  suggestedResponse: string;
  timestamp: Date;
}
```

### Call Categorization — `categorizeCall`

Fires exactly once per session after 15–20 seconds of audio.

| Category | Badge | Description |
|---|---|---|
| `SILENT_DISTRESS` | Red | Caller whispering, tapping, slurring, or otherwise unable to speak freely. **Triggers AlertBanner identical to `triggerAlert`.** |
| `MEDICAL` | Red | Heart attack, injury, unconscious caller |
| `TRAFFIC` | Red | Vehicle accident, road hazard |
| `FIRE_HAZARD` | Red | Fire, gas leak, hazardous material |
| `CRIME` | Red | Robbery, assault, active threat |
| `NON_EMERGENCY` | Gray | Non-urgent — routable to non-emergency line |
| `MONITORING` | Gray | Initial state; still analyzing |

---

## Key Implementation Details

**Session isolation** — Each Twilio `callSid` maps to exactly one `GeminiLiveSession` instance in a module-level `Map<string, GeminiLiveSession>`. State never crosses between calls.

**Session limit guard** — Connections beyond the 6-session cap are rejected with WebSocket close code 1008 before any Gemini session is opened.

**Single-port WebSocket routing** — Both `/twilio` and `/dashboard` WebSocket servers use `noServer: true` and are dispatched via the HTTP server's `upgrade` event. No reverse proxy or second port required.

**Dashboard catch-up** — On new `/dashboard` connection, the server replays all current `CallState` objects from `getAllSessions()` so late-joining frontends immediately see live call state.

**Auto-reconnect** — `useSignalOS()` reconnects to `/dashboard` every 3 seconds on disconnect with a `mountedRef` guard to prevent reconnect after component unmount.

**Confidence double-check** — The system prompt instructs Gemini to enforce 85% confidence internally. `server.ts` also validates `confidence >= 0.85` server-side as a belt-and-suspenders guard.

---

## Getting Started

### Prerequisites

- Node.js 20+
- TypeScript 5+
- Twilio account with a purchased US phone number
- Google AI Studio API key with Gemini Live API access
- Supabase project (free tier works)
- Railway account
- Vercel account

### Environment Variables

`signalos/backend/.env`:
```
GEMINI_API_KEY=your_key_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=3001
```

`signalos/frontend/.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=wss://your-app.up.railway.app
```

`signalos/frontendv2/.env.local` (map dashboard):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_BACKEND_URL=wss://your-app.up.railway.app
```

### Local Development

```bash
# Backend
cd signalos/backend
npm install
npm run dev
# [SignalOS] Backend running on port 3001
# [SignalOS] Twilio endpoint   → ws://localhost:3001/twilio
# [SignalOS] Dashboard endpoint → ws://localhost:3001/dashboard

# Frontend
cd signalos/frontend
npm install
npm run dev
# http://localhost:3000

# Simulator — 4 concurrent fake streams with real audio files
cd signalos/backend
npm run simulate
# [Simulator] Starting 4 simulated streams → ws://localhost:3001/twilio
# [Simulator] Stream running — callId: sim_call_1 | 1/4 active
# ...
```

---

## Deployment

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run `signalos/supabase-schema.sql` — creates the `officers` table with realtime enabled
3. Create the `call_logs` table manually in SQL Editor:
```sql
create table if not exists call_logs (
  id           uuid primary key default gen_random_uuid(),
  caller_name  text not null,
  phone_number text not null,
  transcript   text not null default '',
  created_at   timestamptz not null default now()
);
```
4. Copy your project URL and keys from **Settings → API**:
   - `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `SUPABASE_SERVICE_KEY` — service_role secret (backend only — never expose client-side)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key (frontendv2 only)

### Backend — Railway

1. Connect this repo to Railway
2. Set **Root Directory**: `signalos/backend`
3. Add environment variables in Railway → Variables:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | from Google AI Studio |
| `TWILIO_AUTH_TOKEN` | from Twilio Console |
| `TWILIO_ACCOUNT_SID` | from Twilio Console |
| `SUPABASE_URL` | from Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | service_role key from Supabase → Settings → API |
| `PORT` | leave blank — Railway injects automatically |

4. Railway → Settings → Networking → **Generate Domain**
5. Note your `wss://your-app.up.railway.app` URL

### Twilio — TwiML Bin

1. Twilio Console → Phone Numbers → select your number → Voice Configuration
2. "A call comes in" → **TwiML Bin** → create new:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="wss://your-app.up.railway.app/twilio"/>
  </Start>
  <Pause length="60"/>
</Response>
```

### Frontend — Vercel

1. Connect this repo to Vercel
2. Set **Root Directory**: `signalos/frontend`
3. Add environment variable: `NEXT_PUBLIC_BACKEND_URL=wss://your-app.up.railway.app`

### Confirming the Pipe

Dial your Twilio number and watch Railway logs. Within 2 seconds you should see:

```
[Twilio] New connection established
[Twilio] Stream started — callId: CAxxxx | encoding: audio/x-mulaw @ 8000Hz
[StateManager] Session created — callId: CAxxxx | total sessions: 1
[Gemini] Session opened — callId: CAxxxx | active sessions: 1
[Twilio] First audio chunk received — callId: CAxxxx | payload length: 160 bytes
```

The `First audio chunk received` line confirms the full Twilio → Railway → Gemini pipe is live.

---

## Repository Structure

```
signalos/
├── backend/
│   ├── src/
│   │   ├── server.ts          # HTTP + dual WebSocket server, Twilio handler
│   │   ├── gemini.ts          # Gemini Live session management
│   │   ├── stateManager.ts    # Per-call in-memory state
│   │   ├── broadcaster.ts     # Dashboard WebSocket broadcast
│   │   ├── callLogger.ts      # Supabase call_logs persistence
│   │   ├── simulator.ts       # 4-stream fake audio simulator
│   │   ├── types/index.ts     # Shared type definitions
│   │   └── utils/transcode.ts # μ-law 8kHz → PCM 16kHz
│   ├── prompts/
│   │   └── systemPrompt.txt   # Gemini system instructions
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # Next.js dispatcher dashboard
│   ├── app/page.tsx
│   ├── components/
│   │   ├── CallGrid.tsx       # Per-call status cards with category badges
│   │   ├── AlertBanner.tsx    # Full-width anomaly alert (auto-dismiss 30s)
│   │   └── IncidentReport.tsx # Auto-filling incident report panel
│   ├── lib/socket.ts          # useSignalOS() WebSocket hook
│   └── types/index.ts
├── frontendv2/                # Map-based mobile dashboard (in development)
│   └── src/
│       ├── components/
│       │   ├── CallCard.tsx
│       │   ├── GoogleMapBackground.tsx
│       │   ├── Sidebar.tsx
│       │   ├── DispatchList.tsx
│       │   ├── AnalyticsPanel.tsx
│       │   └── NearestPolice.tsx
│       └── lib/
│           ├── socket.ts
│           └── supabase.ts    # Supabase client (officers realtime)
└── audio/
    └── samples/               # 8kHz mono WAV files for simulator
        ├── normal_call_1.wav
        ├── normal_call_2.wav
        ├── whisper_test.wav
        └── distress_test.wav
```

---

## Research

- Wenstrup, J. et al. (2023). A retrospective study on machine learning-assisted stroke recognition for medical helpline calls. *npj Digital Medicine*, 6, 235. https://doi.org/10.1038/s41746-023-00980-y

  > ML-assisted stroke detection achieved **63.0% sensitivity** vs. **52.7%** for human dispatchers — a 10 percentage point improvement on calls that are time-critical by definition.

- NENA & Carbyne. *Pulse of 9-1-1: State of the Industry Survey* (2023). https://carbyne.com/resources/press/carbyne-and-nena

  > 82% of 911 centers understaffed. 75% of dispatchers report burnout. 56% report work-related anxiety in the past six months.

---

## Team

| Name | Role |
|---|---|
| Erick | Project Manager & Frontend Architecture — ideation, project direction, frontend system design |
| Lucas | System Design & Backend Lead — architecture design, backend structure, feature design |
| Aiden | QA Engineer — Twilio, Railway, WebSocket, Vercel integration and verification |
| Mike | UI/UX Designer — frontend design, dashboard layout, visual components |

---

## License

MIT
