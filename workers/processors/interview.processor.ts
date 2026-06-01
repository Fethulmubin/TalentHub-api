import { Job } from "bullmq";
import { finalizeEvaluation } from "../../modules/interview/interview.service";
import logger from "../../shared/logger/logger";

interface InterviewJobData {
  type: "evaluate" | "timeout" | "reminder";
  sessionId: string;
  userId?: string;
}

export const processInterviewJob = async (job: Job<InterviewJobData>): Promise<void> => {
  const { type, sessionId, userId } = job.data;

  logger.info("Processing interview job", { type, sessionId, attempt: job.attemptsMade });

  switch (type) {
    case "evaluate":
      await finalizeEvaluation(sessionId);
      break;

    case "timeout": {
      const prisma = (await import("../../shared/database/prisma")).default;
      const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
      if (session && session.status === "IN_PROGRESS") {
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { status: "TIMEOUT", phase: "COMPLETED", completedAt: new Date() },
        });
        logger.info("Interview session timed out", { sessionId });
      }
      break;
    }

    case "reminder":
      logger.info("Interview reminder sent", { sessionId, userId });
      break;

    default:
      logger.warn(`Unknown interview job type: ${type}`);
  }
};
