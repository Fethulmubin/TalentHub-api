import { eventBus, Events } from "../../shared/events/eventBus";
import logger from "../../shared/logger/logger";
import * as appRepo from "./applications.repository";
import * as resumeRepo from "../resume/resume.repository";
import { resumeQueue } from "../../workers/queue";

export const getApplicationsByUser = async (userId: string, requestingUserId: string) => {
  if (requestingUserId !== userId) {
    return { status: false as const, message: "Forbidden" };
  }

  const applications = await appRepo.findApplicationsByUser(userId);
  return { status: true as const, applications };
};

export const applyForJob = async (
  jobId: string,
  userId: string,
  filePath: string,
  fileName: string
) => {
  const job = await appRepo.findJobById(jobId);
  if (!job) {
    return { status: false as const, message: "Job not found" };
  }

  try {
    const application = await appRepo.createApplication({ jobId, userId, resumeUrl: filePath });

    const profile = await resumeRepo.createProfile({
      userId,
      fileName,
      fileUrl: filePath,
      rawText: "",
    });

    await resumeQueue.add("process-resume", {
      profileId: profile.id,
      filePath,
      fileName,
      userId,
      applicationId: application.id,
    });

    logger.info("Application submitted, resume queued", { jobId, userId, profileId: profile.id });

    return {
      status: true as const,
      message: "Application submitted successfully",
      application,
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { status: false as const, message: "You already applied to this job" };
    }
    throw error;
  }
};

export const getApplicationsByJob = async (jobId: string, userId: string) => {
  const job = await appRepo.findJobById(jobId);
  if (!job) {
    return { status: false as const, message: "Job not found" };
  }

  if (job.createdById !== userId) {
    return { status: false as const, message: "Forbidden" };
  }

  const applications = await appRepo.findApplicationsByJob(jobId);
  return { status: true as const, applications };
};

export const changeStatus = async (appId: string, status: string, userId: string) => {
  const app = await appRepo.findApplicationById(appId);
  if (!app) {
    return { status: false as const, message: "Application not found" };
  }

  if (app.job.createdById !== userId) {
    return { status: false as const, message: "Forbidden" };
  }

  const updated = await appRepo.updateApplicationStatus(appId, status);

  eventBus.emit(Events.APPLICATION_STATUS_UPDATED, {
    appId,
    status,
    userId: app.userId,
    jobTitle: app.job.title,
    applicantEmail: "",
  });

  logger.info("Application status updated", { appId, status });

  return { status: true as const, message: "Status updated", application: updated };
};
