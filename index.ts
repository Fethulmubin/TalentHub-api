import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
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

app.get("/health", (_req, res) => {
  res.json({ status: true, message: "TalentHub API is running" });
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

server.listen(PORT, () => {
  logger.info(`TalentHub server started on port ${PORT}`, {
    environment: config.nodeEnv,
    corsOrigin: config.cors.origin,
  });
  console.log(`Server is running on port ${PORT}`);
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
