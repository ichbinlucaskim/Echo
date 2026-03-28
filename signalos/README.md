# SignalOS

Real-time AI monitoring layer for 911 on-hold calls.

```
Phone → Twilio → wss://.../twilio → SignalOS Backend → wss://.../dashboard → Dashboard
                                            ↓
                                   Gemini Live API
```

---

## Running the Backend Locally

```bash
cd signalos/backend
npm install
cp .env.example .env
# Fill in GEMINI_API_KEY, TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID in .env
npm run dev
```

Expected output:
```
[SignalOS] Backend running on port 3001
[SignalOS] Twilio endpoint   → ws://localhost:3001/twilio
[SignalOS] Dashboard endpoint → ws://localhost:3001/dashboard
```

---

## Running the Frontend Locally

```bash
cd signalos/frontend
npm install
# Create .env.local:
echo "NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:3001/dashboard" > .env.local
npm run dev
```

Open http://localhost:3000

---

## Deploying to Railway

### Step 1 — Create Railway project

1. Push `signalos/backend/` to GitHub (or your full repo)
2. Go to railway.app → New Project → Deploy from GitHub
3. Select the repo; set the **Root Directory** to `signalos/backend`
4. Railway auto-detects Node.js and runs `npm run build && npm start`

### Step 2 — Set environment variables

In Railway → Variables, add:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | from Google AI Studio |
| `TWILIO_AUTH_TOKEN` | from Twilio Console |
| `TWILIO_ACCOUNT_SID` | from Twilio Console |
| `PORT` | (leave blank — Railway sets this automatically) |

### Step 3 — Get your public URL

In Railway → Settings → Networking → Generate Domain.
Your endpoint will be: `wss://your-app.up.railway.app`

---

## Connecting a Twilio Number

1. In Twilio Console → Phone Numbers → Manage → Active Numbers → select your number
2. Under "Voice & Fax" → "A call comes in" → select **TwiML Bin**
3. Create a new TwiML Bin with this content (replace the URL):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="wss://your-app.up.railway.app/twilio"/>
  </Start>
  <Pause length="60"/>
</Response>
```

4. Save the bin and assign it to your number.

---

## Confirming Audio is Arriving

Dial your Twilio number. Watch the Railway logs (or local terminal). You should see this sequence within ~2 seconds of the call connecting:

```
[Twilio] New connection established
[Twilio] Media stream protocol connected — version: 1.0.0
[Twilio] Stream started — callId: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | streamSid: MZxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | encoding: audio/x-mulaw @ 8000Hz
[StateManager] Session created — callId: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | total sessions: 1
[Twilio] First audio chunk received — callId: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | payload length: 160 bytes (base64 μ-law 8kHz) | chunk: 1
```

**The `First audio chunk received` line is your proof.** If you see it, the full Twilio → Railway pipe is working.

If you don't see it:
- Verify your Railway URL is correct in the TwiML Bin
- Check that Railway generated a public domain (not just an internal one)
- Check Twilio's Call Logs for any stream errors

---

## Audio Samples

Place `.wav` files in `audio/samples/` for testing:

| File | Purpose |
|---|---|
| `normal_call_1.wav` | Baseline — used by simulator |
| `normal_call_2.wav` | Baseline — used by simulator |
| `whisper_test.wav` | Demo — triggers WHISPER alert |
| `stroke_test.wav` | Demo — triggers STROKE alert |

Audio must be 16kHz mono PCM for Gemini Live API. Twilio audio is transcoded automatically by `src/utils/transcode.ts`.
