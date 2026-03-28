/// <reference path="../types/mulaw.d.ts" />
import { mulaw } from "alawmulaw";

// Converts a Twilio Media Stream audio chunk (base64-encoded μ-law 8kHz)
// to a PCM 16kHz mono Buffer suitable for the Gemini Live API.
export function twilioChunkToGeminiAudio(base64Payload: string): Buffer {
  if (typeof base64Payload !== "string" || base64Payload.length === 0) {
    throw new Error("twilioChunkToGeminiAudio: expected non-empty base64 string");
  }
  const mulawBytes = Buffer.from(base64Payload, "base64");
  // alawmulaw returns number[] (16-bit PCM samples), not a TypedArray — no .buffer
  const pcmSamples = mulaw.decode(new Uint8Array(mulawBytes));
  const pcm8kBuffer = Buffer.alloc(pcmSamples.length * 2);
  for (let i = 0; i < pcmSamples.length; i++) {
    pcm8kBuffer.writeInt16LE(pcmSamples[i] | 0, i * 2);
  }
  return upsample8kTo16k(pcm8kBuffer);
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
