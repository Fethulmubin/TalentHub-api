import logger from "../../shared/logger/logger";

let transcriber: any = null;
const WHISPER_MODEL = process.env.WHISPER_MODEL || "Xenova/whisper-base.en";

async function getTranscriber() {
  if (!transcriber) {
    try {
      const { pipeline } = await import("@xenova/transformers");
      logger.info(`Loading Whisper model: ${WHISPER_MODEL}`);
      transcriber = await pipeline("automatic-speech-recognition", WHISPER_MODEL);
      logger.info(`Whisper STT model loaded (${WHISPER_MODEL})`);
    } catch (err) {
      logger.error("Failed to load STT model", { error: (err as Error).message });
      throw err;
    }
  }
  return transcriber;
}

function decodeWav(buffer: Buffer): { audioData: Float32Array; sampleRate: number } {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Invalid WAV file");
  }

  let channels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let audioData: Buffer | null = null;

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === "fmt ") {
      const audioFormat = buffer.readUInt16LE(offset + 8);
      if (audioFormat !== 1 && audioFormat !== 0xFFFE) {
        throw new Error(`Unsupported audio format: ${audioFormat}`);
      }
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === "data") {
      audioData = buffer.subarray(offset + 8, offset + 8 + chunkSize);
    }

    offset += 8 + chunkSize;
  }

  if (!audioData) throw new Error("No data chunk found in WAV file");

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor(audioData.length / bytesPerSample / channels);
  const floatData = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const byteOffset = i * bytesPerSample * channels;
    let sample = 0;

    if (bitsPerSample === 16) {
      sample = audioData.readInt16LE(byteOffset) / 32768;
    } else if (bitsPerSample === 8) {
      sample = (audioData.readUInt8(byteOffset) - 128) / 128;
    } else if (bitsPerSample === 32) {
      sample = audioData.readFloatLE(byteOffset);
    }

    floatData[i] = Math.max(-1, Math.min(1, sample));
  }

  return { audioData: floatData, sampleRate };
}

function resample(audioData: Float32Array, fromRate: number, toRate: number): Float32Array {
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

function normalizeAudio(audioData: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < audioData.length; i++) {
    const abs = Math.abs(audioData[i]);
    if (abs > peak) peak = abs;
  }

  if (peak < 0.01 || peak >= 0.95) return audioData;

  const target = 0.9;
  const gain = target / peak;

  const normalized = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    normalized[i] = Math.max(-1, Math.min(1, audioData[i] * gain));
  }

  return normalized;
}

export async function warmUp(): Promise<void> {
  logger.info(`Pre-warming Whisper STT model (${WHISPER_MODEL})...`);
  await getTranscriber();
  logger.info("Whisper STT model warmed up");
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const startTime = Date.now();
  const { audioData, sampleRate } = decodeWav(audioBuffer);
  const audio16kHz = resample(audioData, sampleRate, 16000);
  const normalized = normalizeAudio(audio16kHz);

  const durationMs = Math.round((audioData.length / sampleRate) * 1000);
  logger.info("STT: starting transcription", {
    originalSampleRate: sampleRate,
    durationMs,
    resampledLength: normalized.length,
  });

  const model = await getTranscriber();
  const result = await model(normalized, {
    language: "english",
    task: "transcribe",
  });

  const text = (result as { text: string }).text.trim();
  logger.info("STT: transcription complete", {
    text: text.slice(0, 100),
    timeMs: Date.now() - startTime,
  });

  return text;
}
