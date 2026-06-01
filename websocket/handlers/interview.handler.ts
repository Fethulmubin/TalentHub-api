import { Server, Socket } from "socket.io";
import * as interviewService from "../../modules/interview/interview.service";
import logger from "../../shared/logger/logger";

export const registerInterviewHandlers = (io: Server, socket: Socket): void => {
  socket.on("interview:join", (sessionId: string) => {
    const user = (socket as any).user;
    socket.join(`interview:${sessionId}`);
    logger.debug(`Socket ${socket.id} joined interview:${sessionId}`, { userId: user?.id });
    socket.emit("interview:joined", { sessionId });
  });

  socket.on("interview:leave", (sessionId: string) => {
    socket.leave(`interview:${sessionId}`);
    logger.debug(`Socket ${socket.id} left interview:${sessionId}`);
  });

  socket.on("interview:code:update", (data: { sessionId: string; code: string; language: string }) => {
    const { sessionId, code, language } = data;
    socket.to(`interview:${sessionId}`).emit("interview:code:sync", {
      userId: (socket as any).user?.id,
      code,
      language,
      timestamp: new Date(),
    });
  });

  socket.on("interview:submit", async (data: { sessionId: string; code: string; language: string; questionId?: string }) => {
    const user = (socket as any).user;
    try {
      const result = await interviewService.submitCode({
        sessionId: data.sessionId,
        code: data.code,
        language: data.language,
        questionId: data.questionId,
      });
      io.to(`interview:${data.sessionId}`).emit("interview:result", {
        userId: user?.id,
        submissionId: result.status ? (result.submission as any)?.id : undefined,
        status: result.status,
        result: result.status ? result.submission : undefined,
        error: result.status ? undefined : result.error,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error("Interview submit error", { sessionId: data.sessionId, error: (err as Error).message });
      socket.emit("interview:error", { message: "Failed to submit code", error: (err as Error).message });
    }
  });

  socket.on("interview:evaluation", async (sessionId: string) => {
    try {
      const result = await interviewService.finalizeEvaluation(sessionId);
      io.to(`interview:${sessionId}`).emit("interview:evaluation:result", {
        ...result,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error("Interview evaluation error", { sessionId, error: (err as Error).message });
      socket.emit("interview:error", { message: "Failed to evaluate", error: (err as Error).message });
    }
  });

  socket.on("interview:voice:transcript", async (data: { sessionId: string; transcript: string; questionId?: string }) => {
    const user = (socket as any).user;
    try {
      const result = await interviewService.submitVoiceTranscript({
        sessionId: data.sessionId,
        transcript: data.transcript,
        questionId: data.questionId,
      });
      socket.emit("interview:voice:evaluated", {
        ...result,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error("Voice transcript error", { sessionId: data.sessionId, error: (err as Error).message });
      socket.emit("interview:error", { message: "Failed to process voice", error: (err as Error).message });
    }
  });
};
