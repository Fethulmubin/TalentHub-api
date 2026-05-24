import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../shared/config/config";
import { JwtPayload } from "../shared/types";
import logger from "../shared/logger/logger";
import { registerHandlers } from "./handlers";

let io: Server | null = null;

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    try {
      const decoded = jwt.verify(token as string, config.jwt.secret) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info("WebSocket client connected", {
      userId: user.id,
      role: user.role,
      socketId: socket.id,
    });

    socket.join(`user:${user.id}`);

    registerHandlers(io!, socket);

    socket.on("disconnect", () => {
      logger.info("WebSocket client disconnected", { socketId: socket.id });
    });
  });

  logger.info("WebSocket server initialized");
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToAll = (event: string, data: unknown): void => {
  if (io) {
    io.emit(event, data);
  }
};
