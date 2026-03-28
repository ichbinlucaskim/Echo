import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CallState } from "./types";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    console.warn("[CallLogger] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — call logs will not be saved");
    return null;
  }
  _client = createClient(url, key);
  return _client;
}

const CALLER_NAMES: Record<string, string> = {
  sim_call_1: "Monica Schmidt",
  sim_call_2: "James Anderson",
  sim_call_3: "Sofia Patel",
  sim_call_4: "Carlos Rodriguez",
  sim_call_5: "Emma Johnson",
};
const DEFAULT_NAME = "Liam Thompson";

const CALLER_PHONES: Record<string, string> = {
  sim_call_1: "(310) 555-0101",
  sim_call_2: "(310) 555-0102",
  sim_call_3: "(310) 555-0103",
  sim_call_4: "(310) 555-0104",
  sim_call_5: "(310) 555-0105",
};
const DEFAULT_PHONE = "(310) 555-0100";

export async function saveCallLog(session: CallState): Promise<void> {
  const client = getClient();
  if (!client) return;

  const callerName = CALLER_NAMES[session.callId] ?? DEFAULT_NAME;
  const phoneNumber = CALLER_PHONES[session.callId] ?? DEFAULT_PHONE;

  const { error } = await client.from("call_logs").insert({
    caller_name: callerName,
    phone_number: phoneNumber,
    transcript: session.transcript || "",
  });

  if (error) {
    console.error(`[CallLogger] Failed to save call log for ${session.callId}:`, error.message);
  } else {
    console.log(`[CallLogger] Saved call log — callId: ${session.callId} | caller: ${callerName}`);
  }
}
