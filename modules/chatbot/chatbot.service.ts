import { generateEmbedding } from "../../shared/embeddings/embedding.service";
import * as resumeRepo from "../resume/resume.repository";
import { ChatQueryInput, Citation, ChatResponse } from "./chatbot.dto";

export async function answerQuestion(input: ChatQueryInput): Promise<ChatResponse> {
  const embedding = await generateEmbedding(input.question);

  const results: any[] = await resumeRepo.vectorSearch(embedding, input.limit * 2);

  const filtered = results.filter((r: any) => r.similarity >= input.minConfidence);
  const top = filtered.slice(0, input.limit);

  const citations: Citation[] = top.map((r: any) => ({
    resumeId: r.resumeId,
    fileName: r.fileName,
    chunkText: r.chunkText,
    chunkIndex: r.chunkIndex,
    skills: r.skills || [],
    yearsExperience: r.yearsExperience,
    similarity: r.similarity,
  }));

  const answer = buildAnswer(input.question, citations);
  const avgConfidence = citations.length > 0
    ? citations.reduce((s, c) => s + c.similarity, 0) / citations.length
    : 0;

  return {
    status: true,
    answer,
    citations,
    confidence: Math.round(avgConfidence * 100) / 100,
    totalResults: citations.length,
  };
}

function buildAnswer(question: string, citations: Citation[]): string {
  const lower = question.toLowerCase();

  if (citations.length === 0) {
    return "No matching candidates found for your query.";
  }

  if (lower.includes("how many") || lower.includes("count")) {
    return `Found ${citations.length} matching candidate${citations.length > 1 ? "s" : ""}.`;
  }

  if (lower.includes("compare")) {
    return buildComparison(citations);
  }

  if (lower.includes("strongest") || lower.includes("best") || lower.includes("top")) {
    return buildTopRanking(citations);
  }

  if (lower.includes("fit") || lower.includes("qualified") || lower.includes("suitable")) {
    return buildFitAnalysis(question, citations);
  }

  return buildGeneralAnswer(citations);
}

function buildComparison(citations: Citation[]): string {
  const names = citations.map((c) => c.fileName.replace(/\.pdf$/i, ""));
  const lines = citations.map((c, i) => {
    const name = c.fileName.replace(/\.pdf$/i, "");
    const skills = c.skills.slice(0, 5).join(", ");
    const exp = c.yearsExperience ? `${c.yearsExperience} years` : "experience not specified";
    return `${i + 1}. **${name}** — ${exp}, skills: ${skills} (relevance: ${(c.similarity * 100).toFixed(0)}%)`;
  });
  return `Here is a comparison of ${names.length} candidate${names.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}`;
}

function buildTopRanking(citations: Citation[]): string {
  const top = citations[0];
  const name = top.fileName.replace(/\.pdf$/i, "");
  return `The strongest match is **${name}** (${(top.similarity * 100).toFixed(0)}% relevance)${
    top.yearsExperience ? ` with ${top.yearsExperience} years of experience` : ""
  }. Skills: ${top.skills.slice(0, 6).join(", ")}.`;
}

function buildFitAnalysis(question: string, citations: Citation[]): string {
  const techWords = extractTechKeywords(question);
  const scored = citations.map((c) => {
    const matchedSkills = c.skills.filter((s) =>
      techWords.some((t) => s.toLowerCase().includes(t))
    );
    return { ...c, matchedSkills };
  });
  scored.sort((a, b) => b.matchedSkills.length - a.similarity);

  const lines = scored.slice(0, 5).map((c, i) => {
    const name = c.fileName.replace(/\.pdf$/i, "");
    const matchStr = c.matchedSkills.length > 0
      ? `matched skills: ${c.matchedSkills.join(", ")}`
      : "no direct skill match";
    return `${i + 1}. **${name}** — ${(c.similarity * 100).toFixed(0)}% relevance, ${matchStr}`;
  });
  return `Candidates fitting your criteria:\n\n${lines.join("\n")}`;
}

function buildGeneralAnswer(citations: Citation[]): string {
  const lines = citations.slice(0, 5).map((c, i) => {
    const name = c.fileName.replace(/\.pdf$/i, "");
    const excerpt = c.chunkText.substring(0, 200).replace(/\n/g, " ");
    return `${i + 1}. **${name}** (${(c.similarity * 100).toFixed(0)}% match)\n   > ${excerpt}...`;
  });
  return `Here are the most relevant candidates:\n\n${lines.join("\n\n")}`;
}

function extractTechKeywords(text: string): string[] {
  const tech = [
    "node", "react", "python", "java", "go", "rust", "aws",
    "docker", "kubernetes", "postgresql", "mongodb", "redis",
    "typescript", "javascript", "graphql", "rest", "api",
  ];
  const lower = text.toLowerCase();
  return tech.filter((t) => lower.includes(t));
}
