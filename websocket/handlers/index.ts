import { Server, Socket } from "socket.io";
import logger from "../../shared/logger/logger";

export const registerHandlers = (io: Server, socket: Socket): void => {
  socket.on("subscribe:job", (jobId: string) => {
    socket.join(`job:${jobId}`);
    logger.debug(`Socket ${socket.id} subscribed to job:${jobId}`);
  });

  socket.on("subscribe:user", (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug(`Socket ${socket.id} subscribed to user:${userId}`);
  });

  socket.on("unsubscribe:job", (jobId: string) => {
    socket.leave(`job:${jobId}`);
  });

  socket.on("unsubscribe:user", (userId: string) => {
    socket.leave(`user:${userId}`);
  });

  socket.on("ping", (cb: any) => {
    if (typeof cb === "function") cb({ ok: true });
  });
};
