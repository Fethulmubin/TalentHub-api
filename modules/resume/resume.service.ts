import { chunkText } from "../../shared/chunking/chunker";
import { generateEmbedding } from "../../shared/embeddings/embedding.service";
import { eventBus, Events } from "../../shared/events/eventBus";
import logger from "../../shared/logger/logger";
import { extractResumeData } from "../../services/resume/extraction.service";
import { resumeQueue } from "../../workers/queue";
import * as resumeRepo from "./resume.repository";
import { SearchResumesInput, SearchResult } from "./resume.dto";

export const processResume = async (
  filePath: string,
  fileName: string,
  userId?: string
) => {
  const profile = await resumeRepo.createProfile({
    userId: userId || null,
    fileName,
    fileUrl: filePath,
    rawText: "",
  });

  const job = await resumeQueue.add("process-resume", {
    profileId: profile.id,
    filePath,
    fileName,
    userId,
  });

  logger.info("Resume processing queued", { profileId: profile.id, jobId: job.id });

  eventBus.emit(Events.RESUME_UPLOADED, {
    resumeId: profile.id,
    fileName,
  });

  return { status: true, message: "Resume queued for processing", profileId: profile.id };
};

export const getProfileById = async (id: string) => {
  const profile = await resumeRepo.findProfileById(id);
  if (!profile) {
    return { status: false as const, message: "Resume profile not found" };
  }
  return { status: true as const, profile };
};

export const searchResumes = async (input: SearchResumesInput): Promise<{ status: boolean; results: SearchResult[] }> => {
  const embedding = await generateEmbedding(input.query);

  let results = await resumeRepo.vectorSearch(embedding, input.limit);

  if (input.filterSkills && input.filterSkills.length > 0) {
    const lowerFilters = input.filterSkills.map((s) => s.toLowerCase());
    results = results.filter((r: any) =>
      (r.skills || []).some((s: string) => lowerFilters.includes(s.toLowerCase()))
    );
  }

  results = results.filter((r: any) => r.similarity >= input.minConfidence);

  return { status: true, results };
};

export const internalProcessResumeData = async (
  profileId: string,
  rawText: string,
  cloudinaryUrl?: string,
  userId?: string
) => {
  const extraction = extractResumeData(rawText);
  const chunks = chunkText(rawText);

  await resumeRepo.updateProfileStatus(profileId, {
    status: "PROCESSING",
    rawText,
    skills: extraction.skills.map((s) => s.name),
    education: extraction.education,
    yearsExperience: extraction.yearsExperience,
    technologies: extraction.technologies,
    projects: extraction.projects,
    summary: extraction.summary,
  });

  if (cloudinaryUrl) {
    await resumeRepo.updateFileUrl(profileId, cloudinaryUrl);
  }

  for (const [idx, chunk] of chunks.entries()) {
    const embedId = `${profileId}-chunk-${idx}`;
    await resumeRepo.createEmbeddingRecord({
      id: embedId,
      resumeId: profileId,
      chunkIndex: idx,
      chunkText: chunk,
    });

    try {
      const embedding = await generateEmbedding(chunk);
      await resumeRepo.updateEmbeddingVector(embedId, embedding);
    } catch (err) {
      logger.error("Embedding generation failed for chunk", {
        profileId,
        chunkIndex: idx,
        error: (err as Error).message,
      });
    }
  }

  for (const skill of extraction.skills) {
    const snippet = findEvidence(rawText, skill.name);
    await resumeRepo.createInsight({
      resumeId: profileId,
      insightType: "SKILL",
      label: skill.name,
      value: skill.name,
      confidence: skill.confidence,
      evidence: snippet,
    });
  }

  for (const edu of extraction.education) {
    await resumeRepo.createInsight({
      resumeId: profileId,
      insightType: "EDUCATION",
      label: edu.degree,
      value: edu.institution || edu.degree,
      confidence: 0.7,
      evidence: edu.degree,
    });
  }

  if (extraction.yearsExperience !== null) {
    await resumeRepo.createInsight({
      resumeId: profileId,
      insightType: "EXPERIENCE",
      label: `${extraction.yearsExperience} years`,
      value: String(extraction.yearsExperience),
      confidence: 0.7,
      evidence: `${extraction.yearsExperience} years of experience`,
    });
  }

  await resumeRepo.updateProfileStatus(profileId, { status: "COMPLETED" });

  eventBus.emit(Events.RESUME_PROCESSED, {
    resumeId: profileId,
    userId,
    skills: extraction.skills.map((s) => s.name),
    yearsExperience: extraction.yearsExperience,
  });

  logger.info("Resume processing completed", {
    profileId,
    chunks: chunks.length,
    skillsFound: extraction.skills.length,
  });
};

function findEvidence(text: string, keyword: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return keyword;
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + keyword.length + 60);
  return text.substring(start, end).trim();
}
