import prisma from "../../shared/database/prisma";

export const findApplicationsByUser = async (userId: string) => {
  return prisma.application.findMany({
    where: { userId },
    include: {
      job: {
        select: { id: true, title: true, price: true, createdBy: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findJobById = async (jobId: string) => {
  return prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, createdById: true },
  });
};

export const createApplication = async (data: {
  jobId: string;
  userId: string;
  resumeUrl: string;
}) => {
  return prisma.application.create({
    data,
    include: {
      job: { select: { id: true, title: true } },
    },
  });
};

export const findApplicationsByJob = async (jobId: string) => {
  return prisma.application.findMany({
    where: { jobId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findApplicationById = async (appId: string) => {
  return prisma.application.findUnique({
    where: { id: appId },
    include: { job: true },
  });
};

export const updateApplicationStatus = async (appId: string, status: string) => {
  return prisma.application.update({
    where: { id: appId },
    data: { status: status as any },
  });
};
