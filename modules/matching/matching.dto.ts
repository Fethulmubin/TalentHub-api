import { z } from "zod";

export const MatchJobDto = z.object({
  refreshCache: z.boolean().optional().default(false),
});

export const ComponentWeights = {
  resume: 0.40,
  interview: 0.30,
  github: 0.20,
  behavior: 0.10,
};

export type MatchJobInput = z.infer<typeof MatchJobDto>;

export interface MatchResult {
  score: number;
  strengths: string[];
  gaps: string[];
  explanation: string;
}

export interface ComponentScore {
  name: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  details: Record<string, number>;
  evidence: string[];
}

export interface CandidateMatchResponse {
  id: string;
  jobId: string;
  applicationId: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  overallScore: number;
  confidence: number;
  components: ComponentScore[];
  strengths: string[];
  gaps: string[];
  explanation: string;
  createdAt: string;
}
