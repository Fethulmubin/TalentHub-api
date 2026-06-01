import prisma from "../../shared/database/prisma";

export const createSession = (data: {
  applicationId: string;
  userId: string;
  jobId: string;
  language: string;
  timeLimit: number;
}) =>
  prisma.interviewSession.create({
    data,
    include: { submissions: true },
  });

export const findSessionById = (id: string) =>
  prisma.interviewSession.findUnique({
    where: { id },
    include: {
      submissions: { orderBy: { submittedAt: "desc" } },
      testResults: true,
      application: { include: { job: true, user: true } },
    },
  });

export const findSessionByApplicationId = (applicationId: string) =>
  prisma.interviewSession.findUnique({
    where: { applicationId },
    include: { submissions: true },
  });

export const updateSession = (id: string, data: Record<string, unknown>) =>
  prisma.interviewSession.update({
    where: { id },
    data,
  });

export const createSubmission = (data: {
  sessionId: string;
  code: string;
  language: string;
  questionId?: string;
}) =>
  prisma.codingSubmission.create({
    data,
  });

export const updateSubmission = (id: string, data: Record<string, unknown>) =>
  prisma.codingSubmission.update({
    where: { id },
    data,
  });

export const createTestResult = (
  data: {
    submissionId: string;
    sessionId: string;
    testIndex: number;
    name?: string;
    passed: boolean;
    input?: string;
    expected?: string;
    actual?: string;
    error?: string;
    duration?: number;
  }[]
) =>
  prisma.testResult.createMany({ data });

export const findUserSessions = (userId: string) =>
  prisma.interviewSession.findMany({
    where: { userId },
    include: {
      application: { include: { job: true } },
      submissions: { take: 1, orderBy: { submittedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
