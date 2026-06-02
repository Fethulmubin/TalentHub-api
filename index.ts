import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import multer from "multer";
import { exec } from "child_process";
import { Readable } from "stream";
import { config } from "./shared/config/config";
import logger from "./shared/logger/logger";
import { errorHandler, notFoundHandler } from "./shared/middleware/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import jobsRoutes from "./modules/jobs/jobs.routes";
import appRoutes from "./modules/applications/applications.routes";
import resumeRoutes from "./modules/resume/resume.routes";
import chatbotRoutes from "./modules/chatbot/chatbot.routes";
import matchingRoutes from "./modules/matching/matching.routes";
import interviewRoutes from "./modules/interview/interview.routes";

import { initializeSocket } from "./websocket/socket";
import { startWorkers } from "./workers/processors";
import { eventBus, Events } from "./shared/events/eventBus";
import { emitToUser, emitToAll } from "./websocket/socket";

const app = express();
const server = http.createServer(app);
const PORT = config.port;

app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}));
app.use(cookieParser());
app.use(express.json());

app.use("/users", authRoutes);
app.use("/jobs", jobsRoutes);
app.use("/applications", appRoutes);
app.use("/resume", resumeRoutes);
app.use("/chat", chatbotRoutes);
app.use("/matching", matchingRoutes);
app.use("/interview", interviewRoutes);

app.post("/tts", (req, res) => {
  const text = req.body?.text?.trim();
  if (!text) {
    res.status(400).json({ status: false, message: "Text is required" });
    return;
  }
  const sanitized = text.replace(/[^a-zA-Z0-9 .,!?;:'"()\-]/g, "").slice(0, 500);
  exec(`spd-say "${sanitized}"`, { timeout: 10000 }, (err) => {
    if (err) {
      logger.error("TTS failed", { error: err.message });
      res.status(500).json({ status: false, message: "TTS failed" });
      return;
    }
    res.json({ status: true, message: "Spoken" });
  });
});

const STT_SERVICE_URL = process.env.STT_SERVICE_URL || "http://localhost:9090";

async function proxyToSttService(audioBuffer: Buffer): Promise<string> {
  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });
  form.append("file", blob, "audio.wav");
  form.append("model", "whisper-1");

  const res = await fetch(`${STT_SERVICE_URL}/v1/audio/transcriptions`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "STT service error" })) as { error?: string };
    throw new Error(err.error || `STT service returned ${res.status}`);
  }

  const data = await res.json() as { text?: string };
  return (data.text || "").trim();
}

app.post("/stt", express.raw({ type: "audio/wav", limit: "10mb" }), async (req, res) => {
  const audioBuffer = req.body as Buffer;
  if (!audioBuffer || audioBuffer.length < 44) {
    res.status(400).json({ error: "Audio file is required" });
    return;
  }
  try {
    const text = await proxyToSttService(audioBuffer);
    res.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    logger.error("STT failed", { error: message });
    res.status(500).json({ error: message });
  }
});

const sttUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }).single("file");
app.post("/stt/upload", sttUpload, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Audio file is required" });
    return;
  }
  try {
    const text = await proxyToSttService(req.file.buffer);
    res.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    logger.error("STT failed", { error: message });
    res.status(500).json({ error: message });
  }
});

app.post("/v1/audio/transcriptions", sttUpload, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file is required" });
    return;
  }
  try {
    const text = await proxyToSttService(req.file.buffer);
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Credentials", "true");
    res.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    logger.error("STT failed", { error: message });
    res.status(500).json({ error: message });
  }
});

app.options("/v1/audio/transcriptions", (req, res) => {
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");
  res.status(204).send();
});

app.get("/health", (_req, res) => {
  res.json({ status: true, message: "TalentHub API is running" });
});

app.post("/v1/audio/speech", async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.input) {
      res.status(400).json({ error: "input is required" });
      return;
    }
    const apiRes = await fetch("http://localhost:5050/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": req.headers.authorization || "Bearer talenthub-tts-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: body.model || "tts-1",
        input: body.input,
        voice: body.voice || "alloy",
        response_format: body.response_format || "mp3",
        speed: body.speed ?? 1.0,
      }),
    });
    if (!apiRes.ok) {
      res.status(apiRes.status).json({ error: "TTS upstream failed" });
      return;
    }
    const audioBuffer = Buffer.from(await apiRes.arrayBuffer());
    res.set("Content-Type", apiRes.headers.get("content-type") || "audio/mpeg");
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Credentials", "true");
    res.send(audioBuffer);
  } catch (err) {
    logger.error("TTS proxy failed", { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: "TTS proxy failed" });
  }
});

app.options("/v1/audio/speech", (req, res) => {
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");
  res.status(204).send();
});

app.use(notFoundHandler);
app.use(errorHandler);

initializeSocket(server);
startWorkers();

eventBus.on(Events.APPLICATION_STATUS_UPDATED, (payload) => {
  emitToUser(payload.userId, "application:status", {
    appId: payload.appId,
    status: payload.status,
    jobTitle: payload.jobTitle,
  });
});

eventBus.on(Events.JOB_CREATED, (payload) => {
  emitToAll("job:new", {
    jobId: payload.jobId,
    title: payload.title,
  });
});

eventBus.on(Events.INTERVIEW_STARTED, (payload) => {
  emitToUser(payload.userId, "interview:started", {
    sessionId: payload.sessionId,
    jobId: payload.jobId,
  });
});

eventBus.on(Events.INTERVIEW_COMPLETED, (payload) => {
  emitToUser(payload.userId, "interview:completed", {
    sessionId: payload.sessionId,
    overallScore: payload.overallScore,
    codingScore: payload.codingScore,
    oralScore: payload.oralScore,
  });
});

eventBus.on(Events.CODE_SUBMITTED, (payload) => {
  emitToUser(payload.userId, "interview:code:result", {
    sessionId: payload.sessionId,
    submissionId: payload.submissionId,
    passed: payload.passed,
    score: payload.score,
  });
});

eventBus.on(Events.RESUME_PROCESSED, (payload) => {
  if (payload.userId) {
    emitToUser(payload.userId, "resume:processed", {
      resumeId: payload.resumeId,
      skills: payload.skills,
    });
  }
  emitToAll("resume:new-profile", {
    resumeId: payload.resumeId,
    skills: payload.skills,
    yearsExperience: payload.yearsExperience,
  });
});

server.listen(PORT, async () => {
  logger.info(`TalentHub server started on port ${PORT}`, {
    environment: config.nodeEnv,
    corsOrigin: config.cors.origin,
  });
  console.log(`Server is running on port ${PORT}`);

  // Pre-warm STT and embedding models
  try {
    const { warmUp } = await import("./modules/interview/stt.service");
    warmUp().then(() => logger.info("STT model ready")).catch((e) => logger.warn("STT warm-up failed", { error: e.message }));
  } catch { }
  try {
    const { generateEmbedding } = await import("./shared/embeddings/embedding.service");
    generateEmbedding("warm-up").then(() => logger.info("Embedding model ready")).catch(() => {});
  } catch { }
});

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { error: reason instanceof Error ? reason.message : reason });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message });
});

async function gracefulShutdown() {
  logger.info("Shutting down gracefully...");
  const { closeAllQueues } = await import("./workers/queue");
  const { stopWorkers } = await import("./workers/processors");
  await stopWorkers();
  await closeAllQueues();
  server.close(() => {
    logger.info("Server shut down");
    process.exit(0);
  });
}
