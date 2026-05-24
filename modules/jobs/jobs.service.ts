import { eventBus, Events } from "../../shared/events/eventBus";
import logger from "../../shared/logger/logger";
import * as jobsRepo from "./jobs.repository";
import { CreateJobInput, JobQueryInput } from "./jobs.dto";

export const getJobs = async (query: JobQueryInput) => {
  const filters: Record<string, unknown> = {};

  if (query.search) {
    filters.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.skill) {
    filters.skills = {
      some: { name: { contains: query.skill, mode: "insensitive" } },
    };
  }

  if (query.title) {
    filters.title = { contains: query.title, mode: "insensitive" };
  }

  const jobs = await jobsRepo.findJobs(filters);
  return { status: true as const, jobs };
};

export const getJobById = async (jobId: string) => {
  const job = await jobsRepo.findJobById(jobId);
  if (!job) {
    return { status: false as const, message: "Job not found" };
  }
  return { status: true as const, job };
};

export const getJobsByUserId = async (userId: string) => {
  const jobs = await jobsRepo.findJobsByUserId(userId);
  return { status: true as const, jobs };
};

export const createJob = async (input: CreateJobInput & { userId: string }) => {
  const job = await jobsRepo.createJob({
    title: input.title,
    description: input.description,
    createdById: input.userId,
    price: input.price,
    skills: input.skills.map((name) => ({ name })),
  });

  eventBus.emit(Events.JOB_CREATED, {
    jobId: job.id,
    employerId: input.userId,
    title: job.title,
  });

  logger.info("Job created", { jobId: job.id, userId: input.userId });

  return { status: true as const, message: "Job created successfully", job };
};
