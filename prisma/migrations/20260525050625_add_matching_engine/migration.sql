-- DropIndex
DROP INDEX "ResumeEmbedding_vector_idx";

-- AlterTable
ALTER TABLE "ResumeProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "InterviewScore" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "communication" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "problemSolving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "technicalDepth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "culturalFit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "interviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "publicRepos" INTEGER NOT NULL DEFAULT 0,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "contributions" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topRepos" JSONB DEFAULT '[]',
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralScore" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "adaptability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collaboration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initiative" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communication" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehavioralScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateMatch" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resumeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interviewScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "githubScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "behaviorScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewScore_applicationId_key" ON "InterviewScore"("applicationId");

-- CreateIndex
CREATE INDEX "InterviewScore_applicationId_idx" ON "InterviewScore"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubProfile_userId_key" ON "GitHubProfile"("userId");

-- CreateIndex
CREATE INDEX "GitHubProfile_userId_idx" ON "GitHubProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BehavioralScore_applicationId_key" ON "BehavioralScore"("applicationId");

-- CreateIndex
CREATE INDEX "BehavioralScore_applicationId_idx" ON "BehavioralScore"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateMatch_applicationId_key" ON "CandidateMatch"("applicationId");

-- CreateIndex
CREATE INDEX "CandidateMatch_jobId_idx" ON "CandidateMatch"("jobId");

-- CreateIndex
CREATE INDEX "CandidateMatch_userId_idx" ON "CandidateMatch"("userId");

-- CreateIndex
CREATE INDEX "CandidateMatch_overallScore_idx" ON "CandidateMatch"("overallScore");

-- AddForeignKey
ALTER TABLE "InterviewScore" ADD CONSTRAINT "InterviewScore_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubProfile" ADD CONSTRAINT "GitHubProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralScore" ADD CONSTRAINT "BehavioralScore_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateMatch" ADD CONSTRAINT "CandidateMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateMatch" ADD CONSTRAINT "CandidateMatch_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateMatch" ADD CONSTRAINT "CandidateMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
