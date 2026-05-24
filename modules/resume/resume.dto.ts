import { z } from "zod";

export const SearchResumesDto = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().int().min(1).max(50).optional().default(10),
  minConfidence: z.number().min(0).max(1).optional().default(0.5),
  filterSkills: z.array(z.string()).optional(),
});

export type SearchResumesInput = z.infer<typeof SearchResumesDto>;

export interface ResumeProfileResponse {
  id: string;
  userId: string | null;
  fileName: string;
  fileUrl: string;
  status: string;
  skills: string[];
  education: any;
  yearsExperience: number | null;
  technologies: string[];
  projects: any;
  summary: string | null;
  insights: CandidateInsightResponse[];
  createdAt: string;
}

export interface CandidateInsightResponse {
  id: string;
  insightType: string;
  label: string;
  value: string;
  confidence: number;
  evidence: string;
}

export interface SearchResult {
  resumeId: string;
  chunkText: string;
  chunkIndex: number;
  fileName: string;
  skills: string[];
  yearsExperience: number | null;
  similarity: number;
}
