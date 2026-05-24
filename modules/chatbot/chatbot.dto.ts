import { z } from "zod";

export const ChatQueryDto = z.object({
  question: z.string().min(3, "Question must be at least 3 characters"),
  limit: z.number().int().min(1).max(30).optional().default(10),
  minConfidence: z.number().min(0).max(1).optional().default(0.4),
});

export type ChatQueryInput = z.infer<typeof ChatQueryDto>;

export interface Citation {
  resumeId: string;
  fileName: string;
  chunkText: string;
  chunkIndex: number;
  skills: string[];
  yearsExperience: number | null;
  similarity: number;
}

export interface ChatResponse {
  status: boolean;
  answer: string;
  citations: Citation[];
  confidence: number;
  totalResults: number;
}
