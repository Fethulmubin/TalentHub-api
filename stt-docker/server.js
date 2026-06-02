const express = require("express");
const multer = require("multer");

const app = express();
const PORT = process.env.STT_PORT || 9000;
const WHISPER_MODEL = process.env.WHISPER_MODEL || "Xenova/whisper-base.en";

let transcriber = null;

async function getTranscriber() {
  if (!transcriber) {
    const { pipeline } = await import("@xenova/transformers");
    console.log(`[STT] Loading model: ${WHISPER_MODEL}`);
    transcriber = await pipeline("automatic-speech-recognition", WHISPER_MODEL);
    console.log(`[STT] Model loaded: ${WHISPER_MODEL}`);
  }
  return transcriber;
}

function decodeWav(buffer) {
  let channels = 1, sampleRate = 16000, bitsPerSample = 16, audioData = null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "fmt ") {
      const audioFormat = buffer.readUInt16LE(offset + 8);
      if (audioFormat !== 1 && audioFormat !== 0xfffe) throw new Error("Unsupported audio format");
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === "data") {
      audioData = buffer.subarray(offset + 8, offset + 8 + chunkSize);
    }
    offset += 8 + chunkSize;
  }
  if (!audioData) throw new Error("No data chunk");

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor(audioData.length / bytesPerSample / channels);
  const floatData = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const byteOffset = i * bytesPerSample * channels;
    let sample = 0;
    if (bitsPerSample === 16) sample = audioData.readInt16LE(byteOffset) / 32768;
    else if (bitsPerSample === 8) sample = (audioData.readUInt8(byteOffset) - 128) / 128;
    else if (bitsPerSample === 32) sample = audioData.readFloatLE(byteOffset);
    floatData[i] = Math.max(-1, Math.min(1, sample));
  }
  return { audioData: floatData, sampleRate };
}

function resample(audioData, fromRate, toRate) {
  if (fromRate === toRate) return audioData;
  const ratio = fromRate / toRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const pos = i * ratio;
    const index = Math.floor(pos);
    const frac = pos - index;
    if (index + 1 < audioData.length) {
      result[i] = audioData[index] * (1 - frac) + audioData[index + 1] * frac;
    } else if (index < audioData.length) {
      result[i] = audioData[index];
    }
  }
  return result;
}

function normalize(audioData) {
  let peak = 0;
  for (let i = 0; i < audioData.length; i++) {
    const abs = Math.abs(audioData[i]);
    if (abs > peak) peak = abs;
  }
  if (peak < 0.01 || peak >= 0.95) return audioData;
  const gain = 0.9 / peak;
  const norm = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    norm[i] = Math.max(-1, Math.min(1, audioData[i] * gain));
  }
  return norm;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post("/v1/audio/transcriptions", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file is required" });
    return;
  }
  try {
    const { audioData, sampleRate } = decodeWav(req.file.buffer);
    const audio16kHz = resample(audioData, sampleRate, 16000);
    const normalized = normalize(audio16kHz);

    const model = await getTranscriber();
    const result = await model(normalized, { language: "english", task: "transcribe" });
    const text = (result.text || "").trim();

    res.set("Access-Control-Allow-Origin", "*");
    res.json({ text });
  } catch (err) {
    console.error("[STT] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: true, service: "talenthub-stt", model: WHISPER_MODEL });
});

app.listen(PORT, async () => {
  console.log(`[STT] Server starting on port ${PORT}`);
  try {
    await getTranscriber();
    console.log(`[STT] Ready on port ${PORT}`);
  } catch (err) {
    console.error("[STT] Failed to load model:", err.message);
    process.exit(1);
  }
});
