import { Queue, Worker, Job } from "bullmq";
import redis from "../shared/database/redis";
import logger from "../shared/logger/logger";

export enum QueueNames {
  EMAIL = "email",
  NOTIFICATION = "notification",
  FILE_PROCESSING = "file-processing",
  RESUME_PROCESSING = "resume-processing",
}

export const emailQueue = new Queue(QueueNames.EMAIL, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

export const notificationQueue = new Queue(QueueNames.NOTIFICATION, {
  connection: redis,
});

export const fileProcessingQueue = new Queue(QueueNames.FILE_PROCESSING, {
  connection: redis,
});

export const resumeQueue = new Queue(QueueNames.RESUME_PROCESSING, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

export const createWorker = (
  queueName: QueueNames,
  processor: (job: Job) => Promise<void>,
  concurrency = 5
): Worker => {
  const worker = new Worker(queueName, processor, {
    connection: redis,
    concurrency,
  });

  worker.on("completed", (job) => {
    logger.info(`Worker completed job ${job.id} in queue ${queueName}`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`Worker failed job ${job?.id} in queue ${queueName}`, {
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    logger.error(`Worker error in queue ${queueName}`, { error: err.message });
  });

  return worker;
};

export const closeAllQueues = async (): Promise<void> => {
  await emailQueue.close();
  await notificationQueue.close();
  await fileProcessingQueue.close();
  await resumeQueue.close();
};
