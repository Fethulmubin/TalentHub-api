import prisma from "../../shared/database/prisma";

export const createProfile = (data: {
  userId?: string | null;
  fileName: string;
  fileUrl: string;
  rawText: string;
}) => {
  return prisma.resumeProfile.create({ data });
};

export const updateProfileStatus = (
  id: string,
  data: {
    status: string;
    skills?: string[];
    education?: any;
    yearsExperience?: number | null;
    technologies?: string[];
    projects?: any;
    summary?: string;
    rawText?: string;
    errorMessage?: string;
  }
) => {
  return prisma.resumeProfile.update({ where: { id }, data });
};

export const updateFileUrl = (id: string, fileUrl: string) => {
  return prisma.resumeProfile.update({ where: { id }, data: { fileUrl } });
};

export const findProfileById = (id: string) => {
  return prisma.resumeProfile.findUnique({
    where: { id },
    include: { insights: true },
  });
};

export const createEmbeddingRecord = (data: {
  id: string;
  resumeId: string;
  chunkIndex: number;
  chunkText: string;
}) => {
  return prisma.resumeEmbedding.create({ data });
};

export const createInsight = (data: {
  resumeId: string;
  insightType: string;
  label: string;
  value: string;
  confidence: number;
  evidence: string;
}) => {
  return prisma.candidateInsight.create({ data });
};

export const vectorSearch = async (
  embedding: number[],
  limit: number
): Promise<any[]> => {
  const vecStr = `[${embedding.join(",")}]`;
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT
      re.id, re."resumeId", re."chunkText", re."chunkIndex",
      rp."fileName", rp.skills, rp."yearsExperience",
      1 - (re.embedding <=> $1::vector) AS similarity
    FROM "ResumeEmbedding" re
    JOIN "ResumeProfile" rp ON rp.id = re."resumeId"
    WHERE re.embedding IS NOT NULL
    ORDER BY re.embedding <=> $1::vector
    LIMIT $2`,
    vecStr,
    limit
  );
  return rows;
};

export const updateEmbeddingVector = async (
  id: string,
  embedding: number[]
) => {
  const vecStr = `[${embedding.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "ResumeEmbedding" SET embedding = $1::vector WHERE id = $2`,
    vecStr,
    id
  );
};

export const deleteProfileById = async (id: string) => {
  await prisma.resumeEmbedding.deleteMany({ where: { resumeId: id } });
  await prisma.candidateInsight.deleteMany({ where: { resumeId: id } });
  await prisma.resumeProfile.delete({ where: { id } });
};

export const countByStatus = (status: string) => {
  return prisma.resumeProfile.count({ where: { status } });
};

export const findInsightsByResumeId = (resumeId: string) => {
  return prisma.candidateInsight.findMany({ where: { resumeId } });
};
