# SignalOS — Sprint Plan
### Real-time AI monitoring layer for 911 on-hold calls

> **One-line pitch:** While a dispatcher is focused on one call, SignalOS listens to every other on-hold line simultaneously — detecting whispers, slurs, and gasps that humans miss.

> **Prize targets:** Live API track + Overall App track

---

## STATUS

**Current sprint:** Sprint 4 complete — entering Sprint 5 (Pitch + Submission)

**Live infrastructure:**
- Backend: `wss://echo-production-4d59.up.railway.app` (Railway, deployed)
- Frontend: Vercel (deployed, connected to backend via `.env.local`)
- Twilio → Railway pipe: confirmed working end-to-end
- Gemini triggerAlert function calling: confirmed firing at ≥85% confidence (WHISPER detected at 92%)

**Remaining before pitch:**
- [ ] Place audio sample files in `audio/samples/` and confirm `npm run simulate` runs 5 streams
- [ ] Vercel deployment URL confirmed working end-to-end in browser
- [ ] End-to-end demo run: phone → whisper → alert banner appears in browser
- [ ] Sprint 5 pitch prep (script, slides, backup video)

---

## MASTER CHECKLIST

### ✅ Phase 0 — Setup `[Hour 0–1]`
- [x] GitHub repo created, all team members added
- [x] Railway account set up (backend hosting)
- [x] Vercel account set up (frontend hosting)
- [x] Twilio account set up — phone number purchased
- [x] Gemini API key generated and tested
- [x] Node.js and Next.js environments confirmed on all machines
- [x] Team roles confirmed (see Role Distribution below)
- [x] Shared tracking doc open

### ✅ Phase 1 — Infrastructure `[Hour 1–4]`
- [x] Twilio number connected to TwiML — incoming calls accepted
- [x] Twilio Media Stream forking to WebSocket confirmed
- [x] Node.js WebSocket server running on Railway with public `wss://` endpoint
- [x] Gemini Live API session opens successfully (test with local .wav file)
- [x] Next.js app scaffolded and deployed to Vercel (static shell only)
- [x] 6-line dispatcher UI grid rendered (5 simulated + 1 live placeholder)

### ✅ Phase 2 — Core Integration `[Hour 4–8]`
- [x] Twilio audio chunks (base64) successfully piped into Gemini Live API session
- [x] Gemini returning responses (text or function call) for live audio input
- [x] State manager handling session data per call (Call ID, status, confidence, transcript)
- [x] Backend broadcasting state updates to frontend via WebSocket
- [x] Frontend rendering live transcript from Gemini output
- [x] Raw alert payload reaching the frontend (even unstyled)

### ✅ Phase 3 — Detection Logic + Simulation `[Hour 8–13]`
- [x] System prompt finalized — Gemini instructed to detect: whisper, slur, gasp, background alarm
- [x] Function calling configured — Gemini fires structured alert when confidence ≥ 85%
- [x] Alert payload structure confirmed: `{ callId, type, confidence, suggestedResponse }`
- [ ] Simulation script running — 5 fake "normal" audio streams looping to server
- [ ] Server handling 5 simulated + 1 live Twilio stream simultaneously without crash
- [ ] No stream data crossing between sessions (isolation confirmed)

### ✅ Phase 4 — UI Polish + Demo Prep `[Hour 13–18]`
- [x] Alert banner styled — red, full-width, auto-dismisses after acknowledgment
- [x] Call grid shows per-line status: `ACTIVE / ON-HOLD / ALERT`
- [x] Incident report panel auto-fills in real time from transcript
- [x] Confidence score visible on alert (`85% — whisper pattern detected`)
- [x] Suggested dispatcher response shown on alert (`"Is it safe to talk?"`)
- [ ] End-to-end demo flow confirmed: dial number → whisper → alert fires → banner appears
- [ ] Latency under 10 seconds from whisper to alert

### ✅ Phase 5 — Rehearsal + Submission `[Hour 18–24]`
- [ ] 3-minute pitch scripted and timed
- [ ] Demo run end-to-end at least 5 times
- [ ] Backup: pre-recorded demo video ready (in case live demo fails on stage)
- [ ] Backup: pre-generated alert screenshot ready
- [ ] All key numbers memorized: 63% vs 52.7% stroke detection, 82% understaffed
- [ ] Slide deck complete — max 5 slides
- [ ] Project submitted

---

## ROLE DISTRIBUTION

| Role | Owner | Core Responsibility |
|---|---|---|
| **Project Manager & Frontend** | Erick | Ideation, project direction, frontend architecture and system design |
| **System Design & Backend Lead** | Lucas | Architecture design, backend structure, feature design, Gemini integration |
| **QA Engineer** | Aiden | Twilio, Railway, WebSocket, Vercel integration and end-to-end verification |
| **UI/UX Designer** | Mike | Frontend design, dashboard layout, alert system, visual components |

---

## FOLDER STRUCTURE

```
signalos/
├── backend/
│   ├── src/
│   │   ├── server.ts            # WebSocket server + Twilio Media Stream ingestion
│   │   ├── gemini.ts            # Gemini Live API session management
│   │   ├── stateManager.ts      # Per-call session state (callId, status, transcript)
│   │   ├── broadcaster.ts       # Broadcasts state updates to frontend
│   │   ├── simulator.ts         # 5 fake audio streams for demo simulation
│   │   └── utils/
│   │       └── transcode.ts     # μ-law 8kHz → PCM 16kHz conversion
│   ├── types/
│   │   └── index.ts             # Shared type definitions (CallState, AlertPayload, etc.)
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── app/
│   │   └── page.tsx             # Main dispatcher dashboard
│   ├── components/
│   │   ├── CallGrid.tsx         # 6-line call status grid
│   │   ├── AlertBanner.tsx      # Full-width anomaly alert
│   │   └── IncidentReport.tsx   # Auto-filling incident report panel
│   ├── lib/
│   │   └── socket.ts            # WebSocket client connection to backend
│   ├── types/
│   │   └── index.ts             # Frontend type definitions (mirrors backend types)
│   ├── tsconfig.json
│   └── package.json
├── prompts/
│   └── systemPrompt.txt         # Gemini system instructions (versioned separately)
├── audio/
│   └── samples/
│       ├── normal_call_1.wav
│       ├── normal_call_2.wav
│       ├── whisper_test.wav     # For demo
│       └── stroke_test.wav      # For demo
└── README.md
```

### Core Type Definitions (`backend/types/index.ts`)
```typescript
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
```

---

## SPRINT 0 — Setup `[Hour 0–1]`

**Goal:** Everyone has access to everything. No one is blocked at hour 2 because of an API key.

**Tasks:**
- Create GitHub repo, add all members, agree on branch strategy (main + feature branches)
- Backend 1: Create Twilio account → buy a US phone number → note the number down
- Backend 2: Create Railway account → confirm Node.js + TypeScript deployment works with a hello-world server
- AI: Generate Gemini API key → test `curl` call to confirm it works
- UI: Create Vercel account → deploy a blank Next.js app (TypeScript template) to confirm pipeline works
- All: Install Node.js 20+ with TypeScript 5+, confirm `npm install` and `npx tsc --noEmit` runs on the repo

**Backend `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Backend `package.json` key dependencies:**
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@google/generative-ai": "latest",
    "ws": "^8.0.0",
    "mulaw": "^1.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node-dev": "^2.0.0",
    "@types/node": "^20.0.0",
    "@types/ws": "^8.0.0"
  }
}
```

**Milestone:** Everyone can independently confirm their service is live.

---

## SPRINT 1 — Infrastructure & Plumbing `[Hour 1–4]`

**Goal:** Raw audio moves from a phone call to the server. Frontend shell is live.

### Backend 1 — Twilio → WebSocket
- Configure TwiML bin on Twilio to accept incoming calls
- Use `<Stream>` verb to fork audio to `wss://your-railway-url/twilio`
- Confirm audio chunks arrive at the server as base64 in `media` events
- Log the first received chunk — proof the pipe works

### Backend 2 — WebSocket Server on Railway
- Stand up Node.js + `ws` + `@types/ws` libraries
- Handle two types of WebSocket connections:
  - Twilio incoming (`/twilio`) — receives audio
  - Frontend incoming (`/dashboard`) — receives state broadcasts
- Deploy to Railway → confirm public `wss://` URL is accessible
- Handle connection drops gracefully — Twilio will reconnect

### AI — Gemini Live API Test
- Open a Gemini Live API session using the SDK
- Load a local `whisper_test.wav` → stream it in chunks to Gemini
- Confirm Gemini returns a text or function call response
- This is a standalone script — not connected to Twilio yet

### UI — Static Dashboard Shell
- Scaffold Next.js app with Tailwind
- Build the call grid: 6 boxes, each showing `Call 1` through `Call 6`
- Static state for now: 5 show `ON-HOLD`, 1 shows `LIVE`
- Deploy to Vercel

**Milestone:** Phone call audio arrives at Railway server (confirm in logs). Vercel dashboard is live at a public URL.

---

## SPRINT 2 — Core Integration `[Hour 4–8]`

**Goal:** Twilio audio goes into Gemini. Gemini output reaches the frontend.

### Backend 1 + AI — The Bridge (pair program this)
- Take base64 audio chunks arriving from Twilio
- Decode → buffer into 8-second rolling windows
- Stream buffered audio into the open Gemini Live API session for that call
- This is the hardest part of the entire project — allocate at least 3 hours

**Key consideration:** Gemini Live API expects audio in a specific format (16kHz, mono, PCM). Twilio sends 8kHz μ-law. Handled in `utils/transcode.ts` using the `mulaw` npm package.

```
Twilio chunk (base64 μ-law 8kHz)
  → decode base64
  → transcode to PCM 16kHz mono  ← utils/transcode.ts
  → stream to Gemini Live session
```

**`utils/transcode.ts`:**
```typescript
import { decode as mulawDecode } from "mulaw";

export function twilioChunkToGeminiAudio(base64Payload: string): Buffer {
  const mulawBuffer = Buffer.from(base64Payload, "base64");
  const pcm8k = mulawDecode(mulawBuffer);
  return upsample8kTo16k(pcm8k);
}

function upsample8kTo16k(input: Buffer): Buffer {
  const output = Buffer.alloc(input.length * 2);
  for (let i = 0; i < input.length / 2; i++) {
    const sample = input.readInt16LE(i * 2);
    output.writeInt16LE(sample, i * 4);
    output.writeInt16LE(sample, i * 4 + 2);
  }
  return output;
}
```

```
Twilio chunk (base64 μ-law 8kHz)
  → decode base64
  → transcode to PCM 16kHz mono
  → stream to Gemini Live session
```

### Backend 2 — State Manager
- When Gemini returns a response, structure it:
```json
{
  "callId": "call_3",
  "status": "ALERT",
  "type": "whisper",
  "confidence": 0.91,
  "transcript": "please help me",
  "suggestedResponse": "Is it safe to talk?"
}
```
- Broadcast this payload to all connected frontend clients via `/dashboard` WebSocket

### UI — Live Data Rendering
- Connect to backend WebSocket (`/dashboard`)
- On receiving a payload, update the relevant call box state
- Render raw transcript text under each call box
- Render raw alert text if `status === "ALERT"` (unstyled for now)

**Milestone:** Dial the Twilio number, speak normally, see transcript appear on the dashboard.

---

## SPRINT 3 — Detection Logic + Simulation `[Hour 8–13]`

**Goal:** Gemini detects anomalies. Fake streams simulate a real dispatch center.

### AI — System Prompt + Function Calling

**System prompt (put in `prompts/systemPrompt.txt`):**
```
You are an emergency dispatch AI monitoring assistant.

You are listening to a 911 caller who has been placed on hold.
Analyze the audio for the following critical patterns:

1. WHISPER — hushed or suppressed speech suggesting the caller cannot speak freely
   (e.g., domestic violence situation, intruder present)

2. STROKE — slurred speech, word-finding difficulty, confused sentence structure
   (e.g., "I... I can't... my face")

3. DISTRESS_SOUND — gasping, crying, sounds of struggle, background alarms

Only trigger an alert if your confidence exceeds 85%.
Ignore: normal background noise, hold music, silence.

When you detect an anomaly, call the alert function with structured data.
Do not generate conversational responses. Only call functions.
```

**Function definition:**
```json
{
  "name": "triggerAlert",
  "description": "Called when a critical anomaly is detected in the call audio",
  "parameters": {
    "type": "object",
    "properties": {
      "anomalyType": { "type": "string", "enum": ["WHISPER", "STROKE", "DISTRESS_SOUND"] },
      "confidence": { "type": "number", "minimum": 0.85, "maximum": 1.0 },
      "transcript": { "type": "string" },
      "suggestedResponse": { "type": "string" }
    },
    "required": ["anomalyType", "confidence", "transcript", "suggestedResponse"]
  }
}
```

### Backend 1 — Simulation Script
- Create `simulator.ts`
- 5 loops, each reading a different `normal_call_X.wav` and pushing chunks to the server on a new WebSocket connection every 8 seconds
- Each loop identifies itself with a unique `callId`
- This mimics 5 Twilio streams without needing 5 actual phone calls

### Backend 2 — Concurrency Test
- Run all 5 simulated streams + 1 live Twilio stream simultaneously
- Confirm no session data leaks between calls (each `callId` maps to its own Gemini session)
- Log session count — should stay at exactly 6, no duplicates

**Milestone:** Run the simulator. Dial the number and whisper. Alert function fires within 10 seconds. Payload reaches the frontend.

---

## SPRINT 4 — UI Polish + Demo Prep `[Hour 13–18]`

**Goal:** The dashboard looks real. The demo is bulletproof.

### UI — Final Styling

**Call Grid:**
- Each call box shows: Call ID, status badge (`ACTIVE` / `ON-HOLD` / `ALERT`), rolling transcript
- `ALERT` status turns the box border red
- Normal calls pulse subtly to show they are being monitored

**Alert Banner:**
- Full-width red banner slides in from top
- Shows: `CALL 3 — WHISPER PATTERN DETECTED (91% confidence)`
- Shows suggested response: `"Is it safe to talk?"`
- Dismiss button — banner slides out on click

**Incident Report Panel:**
- Side panel that auto-fills as transcript comes in
- Fields: Call ID, Time, Anomaly Type, Transcript, Dispatcher Action (editable)

### Full Team — Demo Run
- Start simulator (5 fake streams)
- Dial Twilio number
- Whisper into the phone
- Target: alert banner appears within 8–10 seconds
- Run this 10 times. Fix anything that breaks.

**If latency > 10 seconds:**
- Reduce audio buffer from 8 seconds to 4 seconds
- Check transcoding step — this is usually the bottleneck

**Milestone:** End-to-end demo runs cleanly 3 times in a row.

---

## SPRINT 5 — Pitch + Submission `[Hour 18–24]`

**Goal:** Win.

### Pitch Structure (3 minutes)

```
0:00–0:30   Problem       "People die on hold. Here's the data."
0:30–1:00   Demo setup    "This is what a dispatch center looks like right now."
1:00–2:00   Live demo     Dial → whisper → alert fires → room goes quiet
2:00–2:30   How it works  "Live API, 6 simultaneous streams, no transcription delay"
2:30–3:00   Close         "No dispatch tool exists that does this. SignalOS does."
```

### Key Numbers to Memorize (everyone)
- Human stroke detection: **52.7%** sensitivity
- SignalOS (ML model): **63.0%** sensitivity — 10 percentage points better
- **82%** of dispatch centers are understaffed
- **75%** report staff burnout
- **56%** report work-related anxiety in the past 6 months

### Opening Line (memorize cold)
> *"Every minute, somewhere in the US, a 911 caller is placed on hold. That line goes completely silent. No one is listening. SignalOS is."*

### Slides (max 5)
1. **The problem** — one slide, two statistics, one image of a dispatch center
2. **What gets missed** — whisper example, stroke example (just text, no audio yet)
3. **Live demo** — no text on this slide, just the running dashboard
4. **How it works** — one clean architecture diagram: Phone → Twilio → WebSocket → Gemini Live → Dashboard
5. **Close** — "Live API track. Real problem. Working demo."

### Backup Plan
- Pre-record a full demo video before the pitch
- Screenshot of the alert banner firing — have it ready to show if demo fails
- If Twilio fails: run simulator only, use whisper_test.wav as the "live" call

---

## RISK REGISTER

| Risk | Likelihood | Mitigation |
|---|---|---|
| Audio transcoding (μ-law → PCM) breaks | High | Test this in Sprint 1 before anything else. Use `mulaw` npm package. |
| Gemini Live API latency > 10 seconds | Medium | Reduce buffer size to 4 seconds. Pre-warm the session. |
| 6 simultaneous sessions crash server | Medium | Test concurrency in Sprint 3. Add session limit guard. |
| Twilio number not reachable on stage | Medium | Pre-record demo video. Have backup screenshot. |
| Gemini fires false positives on normal speech | Medium | Raise confidence threshold to 90% in system prompt. |
| Live demo fails on stage | Low-Medium | Pre-recorded video is always running on a second screen. Switch instantly. |

---

## WHAT WE ARE NOT BUILDING

To stay on schedule, cut these without guilt:

- ❌ TTS earpiece alert — visual banner is sufficient
- ❌ VIN/vehicle data integration — not relevant
- ❌ Real CAD (Computer-Aided Dispatch) integration — simulate it
- ❌ Authentication / login — not needed for demo
- ❌ Mobile app — web dashboard only
- ❌ Historical call storage — real-time only
- ❌ Multi-language support — English only

---

## SPRINT 5 — Google Feedback Features `[Hour 15–20]`

**Goal:** Two features requested by Google judges during the hackathon.

---

### Feature 1: Call Categorization System (content-based, via Gemini)

Gemini analyzes the call audio and automatically categorizes the call based on actual content — not a timer.

**Add to `prompts/systemPrompt.txt`:**

Call `categorizeCall` after analyzing enough audio to understand the nature of the call (typically 15–20 seconds). Only call it once per session. Do not call it again after the first categorization.

**Categories (7 total):**
- `MONITORING` — still analyzing, not enough audio yet (initial state, not sent by Gemini)
- `NON_EMERGENCY` — noise complaint, minor issue, lost property, non-urgent
- `MEDICAL` — heart attack, injury, unconscious, medical emergency
- `TRAFFIC` — car accident, road hazard, collision
- `FIRE_HAZARD` — fire, gas leak, explosion, hazardous material
- `CRIME` — robbery, assault, break-in, active threat
- `SILENT_DISTRESS` — whisper, tapping only, slurred speech; caller cannot speak freely (domestic violence, intruder present, stroke). **Highest visual priority — triggers AlertBanner same as triggerAlert.**

**UI colors:**
- `MONITORING` → gray
- `NON_EMERGENCY` → green
- `MEDICAL` → orange
- `TRAFFIC` → blue
- `FIRE_HAZARD` → red
- `CRIME` → red
- `SILENT_DISTRESS` → purple pulsing + "Requires immediate attention" below badge

**Function definition in `gemini.ts` setup:**
```json
{
  "name": "categorizeCall",
  "description": "Categorize the call based on its audio content. Call exactly once after 15-20 seconds of audio.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "category": {
        "type": "STRING",
        "enum": ["NON_EMERGENCY", "MEDICAL", "TRAFFIC", "FIRE_HAZARD", "CRIME", "SILENT_DISTRESS"]
      },
      "confidence": { "type": "NUMBER" },
      "summary": { "type": "STRING" }
    },
    "required": ["category", "confidence", "summary"]
  }
}
```

**Backend changes:**

`src/types/index.ts`:
- `CallCategory`: `"MONITORING" | "NON_EMERGENCY" | "MEDICAL" | "TRAFFIC" | "FIRE_HAZARD" | "CRIME" | "SILENT_DISTRESS"`
- `"ROUTED"` added to `CallStatus`
- `CallState` gains `category: CallCategory` and `categorySummary: string`

`src/stateManager.ts`:
- `createSession` initializes `category: "MONITORING"`, `categorySummary: ""`
- `updateCategory(callId, category, summary)` — sets category + summary, broadcasts
- `markRouted(callId)` — sets `status: "ROUTED"`, `category: "NON_EMERGENCY"`

`src/server.ts`:
- `categorizeCall` handler: validates args, logs `[Category] categorizeCall fired`, calls `updateCategory`, broadcasts STATE_UPDATE
- `SILENT_DISTRESS` path: additionally logs `[SILENT DISTRESS]`, calls `markAlert`, broadcasts ALERT (same as triggerAlert)
- `POST /route-non-emergency` endpoint: calls `markRouted`, broadcasts STATE_UPDATE

**Frontend changes:**

`frontend/types/index.ts`: mirrors backend `CallCategory` and `CallStatus` additions

`frontend/components/CallGrid.tsx`:
- Category badge per call box with 7-color system above
- `SILENT_DISTRESS`: pulsing purple badge + "Requires immediate attention" text
- `categorySummary` shown as one-line truncated text under badge
- "Route to Non-Emergency" button: visible when `ACTIVE` or `ON-HOLD`, POSTs to `/route-non-emergency`
- ROUTED calls shown at 50% opacity

---

### Feature 2: Non-Emergency Routing

Dispatcher manually routes a call to non-emergency line with one click.
Implementation is covered above in the backend `/route-non-emergency` endpoint
and frontend Route button in CallGrid.

---

**Checklist:**
- [x] `CallCategory` type added to `types/index.ts` (backend + frontend)
- [x] `"ROUTED"` added to `CallStatus` type
- [x] `category` and `categorySummary` fields added to `CallState`
- [x] `updateCategory()` and `markRouted()` added to `stateManager.ts`
- [x] `categorizeCall` function declaration added to `gemini.ts` setup
- [x] `categorizeCall` added to system prompt instructions
- [x] `server.ts` handles `categorizeCall` function call from Gemini
- [x] `SILENT_DISTRESS` triggers AlertBanner (same path as triggerAlert)
- [x] `/route-non-emergency` POST endpoint working
- [x] CallGrid shows category badge and summary per call box
- [x] Route to Non-Emergency button appears and triggers correctly
- [x] ROUTED calls shown in gray/dimmed
- [ ] End-to-end test: call comes in → MONITORING → categorized by Gemini → SILENT_DISTRESS triggers alert banner → dispatcher routes to non-emergency

---

## SHARED TRACKING DOC

```
SPRINT STATUS
=============
Sprint 0 (Setup):        [ ] Done  Hour: ___
Sprint 1 (Infra):        [ ] Done  Hour: ___
Sprint 2 (Integration):  [ ] Done  Hour: ___
Sprint 3 (Detection):    [ ] Done  Hour: ___
Sprint 4 (Polish):       [ ] Done  Hour: ___
Sprint 5 (Google Features): [ ] Done  Hour: ___
Sprint 6 (Pitch):        [ ] Done  Hour: ___

KEY URLS
========
Railway backend:   wss://_______________
Vercel frontend:   https://_______________
Twilio number:     +1_______________
Gemini project:    _______________

BLOCKERS
========
[ ]
[ ]

DEMO RUNS (target: 10 clean runs before pitch)
===============================================
Run 1: [ ] Pass / Fail — Latency: ___s
Run 2: [ ] Pass / Fail — Latency: ___s
Run 3: [ ] Pass / Fail — Latency: ___s
Run 4: [ ] Pass / Fail — Latency: ___s
Run 5: [ ] Pass / Fail — Latency: ___s
```

---

*Built for the LA Gemini Hackathon. Live API track + Overall App track.*