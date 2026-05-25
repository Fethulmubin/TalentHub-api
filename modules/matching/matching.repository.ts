import prisma from "../../shared/database/prisma";

export const findJobById = async (jobId: string) => {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: {
      skills: true,
      applications: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });
};

export const findApplicationsByJob = async (jobId: string) => {
  return prisma.application.findMany({
    where: { jobId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findResumeByUserId = async (userId: string) => {
  return prisma.resumeProfile.findFirst({
    where: { userId },
    include: {
      insights: true,
      embeddings: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findCandidateMatch = async (jobId: string, applicationId: string) => {
  return prisma.candidateMatch.findUnique({
    where: { applicationId },
    include: { application: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
};

export const upsertCandidateMatch = async (data: {
  jobId: string;
  applicationId: string;
  userId: string;
  overallScore: number;
  resumeScore: number;
  interviewScore: number;
  githubScore: number;
  behaviorScore: number;
  confidence: number;
  strengths: string[];
  gaps: string[];
  explanation: string;
}) => {
  return prisma.candidateMatch.upsert({
    where: { applicationId: data.applicationId },
    create: data,
    update: data,
    include: {
      application: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
};

export const findRankingsByJob = async (jobId: string) => {
  return prisma.candidateMatch.findMany({
    where: { jobId },
    include: {
      application: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { overallScore: "desc" },
  });
};

export const findInterviewScore = async (applicationId: string) => {
  return prisma.interviewScore.findUnique({ where: { applicationId } });
};

export const findBehavioralScore = async (applicationId: string) => {
  return prisma.behavioralScore.findUnique({ where: { applicationId } });
};

export const findGitHubProfile = async (userId: string) => {
  return prisma.gitHubProfile.findUnique({ where: { userId } });
};

export const deleteMatchForApplication = async (applicationId: string) => {
  return prisma.candidateMatch.delete({ where: { applicationId } });
};
