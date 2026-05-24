import { createWorker, QueueNames } from "../queue";
import { processEmailJob } from "./email.processor";
import { processResumeJob } from "./resume.processor";
import logger from "../../shared/logger/logger";

let workers: ReturnType<typeof createWorker>[] = [];

export const startWorkers = (): void => {
  const emailWorker = createWorker(QueueNames.EMAIL, processEmailJob);
  workers.push(emailWorker);

  const resumeWorker = createWorker(QueueNames.RESUME_PROCESSING, processResumeJob, 2);
  workers.push(resumeWorker);

  logger.info("BullMQ workers started", { count: workers.length });
};

export const stopWorkers = async (): Promise<void> => {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
  logger.info("BullMQ workers stopped");
};
