import prisma from "../../shared/database/prisma";

export const findJobs = async (filters: Record<string, unknown>) => {
  return prisma.job.findMany({
    where: filters,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      skills: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findJobById = async (jobId: string) => {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      skills: true,
    },
  });
};

export const findJobsByUserId = async (userId: string) => {
  return prisma.job.findMany({
    where: { createdById: userId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      skills: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createJob = async (data: {
  title: string;
  description: string;
  createdById: string;
  price?: number | null;
  skills: { name: string }[];
}) => {
  return prisma.job.create({
    data: {
      title: data.title,
      description: data.description,
      createdById: data.createdById,
      price: data.price,
      skills: {
        connectOrCreate: data.skills.map((skill) => ({
          where: { name: skill.name },
          create: { name: skill.name },
        })),
      },
    },
    include: { skills: true },
  });
};
