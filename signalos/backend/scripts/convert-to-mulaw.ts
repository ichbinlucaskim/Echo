/**
 * Converts PCM 16-bit 8kHz WAV files in audio/samples/ to μ-law 8kHz WAV files.
 * Uses the alawmulaw library already in the project.
 *
 * Run: npx ts-node scripts/convert-to-mulaw.ts
 */

/// <reference path="../src/types/mulaw.d.ts" />
import { mulaw } from "alawmulaw";
import * as fs from "fs";
import * as path from "path";

const SAMPLES_DIR = path.resolve(__dirname, "../../audio/samples");
const FILES = [
  "normal_call_1.wav",
  "normal_call_2.wav",
  "distress_test.wav",
  "whisper_test.wav",
];

function buildMulawWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(44);
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 8; // μ-law is 8-bit
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4); // file size - 8
  header.write("WAVE", 8);

  // fmt chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // chunk size
  header.writeUInt16LE(7, 20); // audio format: 7 = μ-law
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

for (const file of FILES) {
  const inputPath = path.join(SAMPLES_DIR, file);

  if (!fs.existsSync(inputPath)) {
    console.warn(`Skipping ${file} — not found`);
    continue;
  }

  const raw = fs.readFileSync(inputPath);
  const pcmData = raw.subarray(44); // skip WAV header

  // Read PCM 16-bit LE samples
  const sampleCount = pcmData.length / 2;
  const samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = pcmData.readInt16LE(i * 2);
  }

  // Encode to μ-law (returns Uint8Array)
  const mulawBytes = mulaw.encode(Array.from(samples));
  const mulawBuffer = Buffer.from(mulawBytes);

  // Build new WAV with μ-law header
  const header = buildMulawWavHeader(mulawBuffer.length);
  const output = Buffer.concat([header, mulawBuffer]);

  // Backup original then overwrite
  const backupPath = path.join(SAMPLES_DIR, file.replace(".wav", ".pcm.bak.wav"));
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log(`Backed up ${file} → ${path.basename(backupPath)}`);
  }

  fs.writeFileSync(inputPath, output);
  const durationSec = (sampleCount / 8000).toFixed(1);
  console.log(
    `Converted ${file} — ${sampleCount} samples (${durationSec}s) → ${mulawBuffer.length} bytes μ-law`
  );
}

console.log("\nDone. Original PCM files backed up as *.pcm.bak.wav");
