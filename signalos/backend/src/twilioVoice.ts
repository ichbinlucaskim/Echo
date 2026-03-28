import twilio from "twilio";

/**
 * Twilio Programmable Voice REST helpers.
 * callSid is the Twilio Call SID (same as our session callId for real PSTN calls).
 */

function getClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export function isTwilioConfigured(): boolean {
  return getClient() !== null;
}

/** Terminates the live call in Twilio (hang up). */
export async function hangupCall(callSid: string): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.warn(
      "[Twilio] hangup skipped — TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set"
    );
    return false;
  }
  try {
    await client.calls(callSid).update({ status: "completed" });
    console.log(`[Twilio] Call ended — callSid: ${callSid}`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Twilio] hangup failed for ${callSid}: ${msg}`);
    return false;
  }
}

/**
 * Redirects in-progress call to new TwiML (e.g. hold music or resume stream).
 * Requires a publicly reachable URL. Optional — see env TWILIO_HOLD_TWIML_URL / TWILIO_RESUME_TWIML_URL.
 */
export async function redirectCall(callSid: string, twimlUrl: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.calls(callSid).update({ url: twimlUrl });
    console.log(`[Twilio] Call redirected — callSid: ${callSid}`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Twilio] redirect failed for ${callSid}: ${msg}`);
    return false;
  }
}
