CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "ResumeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT '{}',
    "education" JSONB DEFAULT '[]',
    "yearsExperience" DOUBLE PRECISION,
    "technologies" TEXT[] DEFAULT '{}',
    "projects" JSONB DEFAULT '[]',
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeEmbedding" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateInsight" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumeProfile_userId_idx" ON "ResumeProfile"("userId");
CREATE INDEX "ResumeProfile_status_idx" ON "ResumeProfile"("status");
CREATE INDEX "ResumeEmbedding_resumeId_idx" ON "ResumeEmbedding"("resumeId");
CREATE INDEX "CandidateInsight_resumeId_idx" ON "CandidateInsight"("resumeId");
CREATE INDEX "CandidateInsight_insightType_idx" ON "CandidateInsight"("insightType");
CREATE INDEX "ResumeEmbedding_vector_idx" ON "ResumeEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

ALTER TABLE "ResumeProfile" ADD CONSTRAINT "ResumeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResumeEmbedding" ADD CONSTRAINT "ResumeEmbedding_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "ResumeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateInsight" ADD CONSTRAINT "CandidateInsight_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "ResumeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
