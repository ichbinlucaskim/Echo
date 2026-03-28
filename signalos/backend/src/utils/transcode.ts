import { mulaw } from "alawmulaw";

// Converts a Twilio Media Stream audio chunk (base64-encoded μ-law 8kHz)
// to a PCM 16kHz mono Buffer suitable for the Gemini Live API.
export function twilioChunkToGeminiAudio(base64Payload: string): Buffer {
  const mulawBytes = Buffer.from(base64Payload, "base64");
  // mulaw.decode: Uint8Array of 8-bit μ-law samples → Int16Array of 16-bit PCM
  const pcm16Samples = mulaw.decode(new Uint8Array(mulawBytes));
  const pcm8kBuffer = Buffer.from(pcm16Samples.buffer);
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
