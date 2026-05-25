import * as matchRepo from "./matching.repository";
import { ComponentWeights } from "./matching.dto";
import type { ComponentScore, CandidateMatchResponse } from "./matching.dto";
import logger from "../../shared/logger/logger";
import { eventBus, Events } from "../../shared/events/eventBus";

const SIMILARITY_WEIGHT = 0.35;
const SKILL_OVERLAP_WEIGHT = 0.40;
const EXPERIENCE_WEIGHT = 0.15;
const EDUCATION_WEIGHT = 0.10;

const GITHUB_CONTRIBUTION_WEIGHT = 0.30;
const GITHUB_LANGUAGE_WEIGHT = 0.25;
const GITHUB_REPO_QUALITY_WEIGHT = 0.25;
const GITHUB_FOLLOWER_WEIGHT = 0.20;

const INTERVIEW_COMMUNICATION_WEIGHT = 0.25;
const INTERVIEW_PROBLEM_SOLVING_WEIGHT = 0.30;
const INTERVIEW_TECHNICAL_WEIGHT = 0.30;
const INTERVIEW_CULTURE_WEIGHT = 0.15;

const BEHAVIOR_ADAPTABILITY_WEIGHT = 0.25;
const BEHAVIOR_COLLABORATION_WEIGHT = 0.30;
const BEHAVIOR_INITIATIVE_WEIGHT = 0.25;
const BEHAVIOR_COMMUNICATION_WEIGHT = 0.20;

function normalizeScore(raw: number, min = 0, max = 100): number {
  return Math.max(0, Math.min(100, ((raw - min) / (max - min)) * 100));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function jaccardSimilarity<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function computeResumeScore(
  jobSkills: string[],
  resumeSkills: string[],
  technologies: string[],
  yearsExperience: number | null,
  experienceRequired?: number
): { score: number; strengths: string[]; gaps: string[]; details: Record<string, number> } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  const skillOverlap = jaccardSimilarity(
    jobSkills.map((s) => s.toLowerCase().trim()),
    [...resumeSkills, ...technologies].map((s) => s.toLowerCase().trim())
  );
  const skillScore = normalizeScore(skillOverlap * 100);

  const matchedSkills = jobSkills.filter((js) =>
    [...resumeSkills, ...technologies].some(
      (rs) => rs.toLowerCase().trim() === js.toLowerCase().trim()
    )
  );
  const missingSkills = jobSkills.filter(
    (js) =>
      ![...resumeSkills, ...technologies].some(
        (rs) => rs.toLowerCase().trim() === js.toLowerCase().trim()
      )
  );

  if (matchedSkills.length > 0) {
    strengths.push(`Matched skills: ${matchedSkills.join(", ")}`);
  }
  if (missingSkills.length > 0) {
    gaps.push(`Missing skills: ${missingSkills.join(", ")}`);
  }

  let expScore = 50;
  if (yearsExperience != null && experienceRequired != null && experienceRequired > 0) {
    expScore = normalizeScore(Math.min(yearsExperience / experienceRequired, 2) * 50);
    if (yearsExperience >= experienceRequired) {
      strengths.push(`${yearsExperience} years of experience meets requirement`);
    } else {
      gaps.push(`Experience gap: ${yearsExperience}yrs (required: ${experienceRequired}yrs)`);
    }
  }

  const educationScore = 70;

  const totalResume =
    skillScore * SKILL_OVERLAP_WEIGHT +
    expScore * EXPERIENCE_WEIGHT +
    educationScore * EDUCATION_WEIGHT;

  const finalScore = clamp(totalResume);

  return {
    score: Math.round(finalScore),
    strengths,
    gaps,
    details: {
      skillMatch: Math.round(skillScore),
      experienceMatch: Math.round(expScore),
      educationMatch: Math.round(educationScore),
    },
  };
}

function computeInterviewScore(
  interview: {
    communication: number;
    problemSolving: number;
    technicalDepth: number;
    culturalFit: number;
    overallScore: number;
  } | null
): { score: number; strengths: string[]; gaps: string[]; details: Record<string, number> } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (!interview) {
    return {
      score: 0,
      strengths: [],
      gaps: ["No interview data available"],
      details: { communication: 0, problemSolving: 0, technicalDepth: 0, culturalFit: 0 },
    };
  }

  const weighted =
    interview.communication * INTERVIEW_COMMUNICATION_WEIGHT +
    interview.problemSolving * INTERVIEW_PROBLEM_SOLVING_WEIGHT +
    interview.technicalDepth * INTERVIEW_TECHNICAL_WEIGHT +
    interview.culturalFit * INTERVIEW_CULTURE_WEIGHT;

  const finalScore = clamp(weighted);

  if (interview.communication >= 70) strengths.push("Strong communication skills");
  else gaps.push("Communication needs improvement");

  if (interview.problemSolving >= 70) strengths.push("Excellent problem-solving ability");
  else gaps.push("Problem-solving skills need development");

  if (interview.technicalDepth >= 70) strengths.push("Deep technical knowledge");
  else gaps.push("Technical depth below expectation");

  if (interview.culturalFit >= 70) strengths.push("Good cultural fit");
  else gaps.push("Cultural fit concerns");

  return {
    score: Math.round(finalScore),
    strengths,
    gaps,
    details: {
      communication: Math.round(interview.communication),
      problemSolving: Math.round(interview.problemSolving),
      technicalDepth: Math.round(interview.technicalDepth),
      culturalFit: Math.round(interview.culturalFit),
    },
  };
}

function computeGitHubScore(
  github: {
    publicRepos: number;
    followers: number;
    contributions: number;
    languages: string[];
    topRepos: any[];
  } | null,
  jobSkills: string[]
): { score: number; strengths: string[]; gaps: string[]; details: Record<string, number> } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (!github) {
    return {
      score: 0,
      strengths: [],
      gaps: ["No GitHub profile linked"],
      details: { contributions: 0, languageMatch: 0, repoQuality: 0, followers: 0 },
    };
  }

  const contributionScore = normalizeScore(github.contributions, 0, 500);
  if (github.contributions >= 100) strengths.push(`Active contributor (${github.contributions}+ contributions)`);
  else gaps.push("Low GitHub contribution activity");

  const languageMatch = jaccardSimilarity(
    jobSkills.map((s) => s.toLowerCase()),
    github.languages.map((l) => l.toLowerCase())
  );
  const languageScore = normalizeScore(languageMatch * 100);
  if (languageMatch > 0.3) strengths.push("Repository languages align with job requirements");
  else gaps.push("GitHub languages do not match job requirements");

  const repoQuality = github.publicRepos > 0 ? normalizeScore(github.publicRepos * 5, 0, 50) : 0;
  if (github.publicRepos > 5) strengths.push(`Solid GitHub portfolio (${github.publicRepos} public repos)`);
  else if (github.publicRepos === 0) gaps.push("No public repositories");

  const followerScore = normalizeScore(github.followers, 0, 100);

  const total =
    contributionScore * GITHUB_CONTRIBUTION_WEIGHT +
    languageScore * GITHUB_LANGUAGE_WEIGHT +
    repoQuality * GITHUB_REPO_QUALITY_WEIGHT +
    followerScore * GITHUB_FOLLOWER_WEIGHT;

  const finalScore = clamp(total);

  return {
    score: Math.round(finalScore),
    strengths,
    gaps,
    details: {
      contributions: Math.round(contributionScore),
      languageMatch: Math.round(languageScore),
      repoQuality: Math.round(repoQuality),
      followers: Math.round(followerScore),
    },
  };
}

function computeBehaviorScore(
  behavior: {
    adaptability: number;
    collaboration: number;
    initiative: number;
    communication: number;
    overallScore: number;
  } | null
): { score: number; strengths: string[]; gaps: string[]; details: Record<string, number> } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (!behavior) {
    return {
      score: 0,
      strengths: [],
      gaps: ["No behavioral assessment data"],
      details: { adaptability: 0, collaboration: 0, initiative: 0, communication: 0 },
    };
  }

  const weighted =
    behavior.adaptability * BEHAVIOR_ADAPTABILITY_WEIGHT +
    behavior.collaboration * BEHAVIOR_COLLABORATION_WEIGHT +
    behavior.initiative * BEHAVIOR_INITIATIVE_WEIGHT +
    behavior.communication * BEHAVIOR_COMMUNICATION_WEIGHT;

  const finalScore = clamp(weighted);

  if (behavior.adaptability >= 70) strengths.push("Highly adaptable");
  else gaps.push("Adaptability needs improvement");

  if (behavior.collaboration >= 70) strengths.push("Strong team collaborator");
  else gaps.push("Collaboration skills need development");

  if (behavior.initiative >= 70) strengths.push("Takes initiative");
  else gaps.push("Could show more initiative");

  if (behavior.communication >= 70) strengths.push("Effective communicator");
  else gaps.push("Communication skills need improvement");

  return {
    score: Math.round(finalScore),
    strengths,
    gaps,
    details: {
      adaptability: Math.round(behavior.adaptability),
      collaboration: Math.round(behavior.collaboration),
      initiative: Math.round(behavior.initiative),
      communication: Math.round(behavior.communication),
    },
  };
}

function generateExplanation(
  overall: number,
  components: ComponentScore[],
  confidence: number
): string {
  const topComp = components
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const highScoring = topComp.filter((c) => c.weightedScore >= 25);
  const lowScoring = topComp.filter((c) => c.weightedScore < 15);

  let explanation = `Overall match score: ${overall}% (confidence: ${(confidence * 100).toFixed(0)}%). `;

  if (highScoring.length > 0) {
    explanation += `Strongest areas: ${highScoring.map((c) => `${c.name} (${Math.round(c.weightedScore)}%)`).join(", ")}. `;
  }

  if (lowScoring.length > 0) {
    explanation += `Areas for improvement: ${lowScoring.map((c) => `${c.name} (${Math.round(c.weightedScore)}%)`).join(", ")}. `;
  }

  if (overall >= 80) {
    explanation += "Strong candidate overall.";
  } else if (overall >= 60) {
    explanation += "Qualified candidate with some areas to develop.";
  } else if (overall >= 40) {
    explanation += "Candidate has potential but significant gaps exist.";
  } else {
    explanation += "Candidate may not be suitable for this role.";
  }

  return explanation;
}

function computeConfidence(components: ComponentScore[]): number {
  if (components.length === 0) return 0;

  const availabilityWeights = components.map((c) => {
    const hasData = c.rawScore > 0 || Object.values(c.details).some((v) => v > 0);
    return hasData ? c.weight : 0;
  });

  const availableWeight = availabilityWeights.reduce((a, b) => a + b, 0);
  const totalWeight = components.reduce((a, c) => a + c.weight, 0);

  if (totalWeight === 0) return 0;

  const dataCompleteness = availableWeight / totalWeight;

  const variance =
    components.length > 1
      ? components.reduce((sum, c) => sum + Math.pow(c.rawScore - components.reduce((s, cc) => s + cc.rawScore, 0) / components.length, 2), 0) /
        components.length
      : 0;

  const consistency = Math.max(0, 1 - variance / 5000);

  return clamp(Math.round((dataCompleteness * 0.6 + consistency * 0.4) * 100)) / 100;
}

function deduplicate(items: string[]): string[] {
  return [...new Set(items)];
}

export const matchApplication = async (jobId: string, applicationId: string) => {
  const job = await matchRepo.findJobById(jobId);
  if (!job) {
    return { status: false as const, message: "Job not found" };
  }

  const app = job.applications.find((a) => a.id === applicationId);
  if (!app) {
    return { status: false as const, message: "Application not found for this job" };
  }

  const userId = app.userId;
  const jobSkills = job.skills.map((s) => s.name);

  const resume = await matchRepo.findResumeByUserId(userId);
  const interview = await matchRepo.findInterviewScore(applicationId);
  const behavior = await matchRepo.findBehavioralScore(applicationId);
  const github = await matchRepo.findGitHubProfile(userId);

  const resumeResult = resume
    ? computeResumeScore(jobSkills, resume.skills, resume.technologies, resume.yearsExperience)
    : { score: 0, strengths: ["No resume data available"], gaps: ["Resume required for matching"], details: { skillMatch: 0, experienceMatch: 0, educationMatch: 0 } };

  const interviewResult = computeInterviewScore(interview);
  const githubResult = computeGitHubScore(github ? { ...github, topRepos: (github.topRepos as any[]) || [] } : null, jobSkills);
  const behaviorResult = computeBehaviorScore(behavior);

  const components: ComponentScore[] = [
    {
      name: "Resume",
      weight: ComponentWeights.resume,
      rawScore: resumeResult.score,
      weightedScore: resumeResult.score * ComponentWeights.resume,
      details: resumeResult.details,
      evidence: resumeResult.strengths,
    },
    {
      name: "Interview",
      weight: ComponentWeights.interview,
      rawScore: interviewResult.score,
      weightedScore: interviewResult.score * ComponentWeights.interview,
      details: interviewResult.details,
      evidence: interviewResult.strengths,
    },
    {
      name: "GitHub",
      weight: ComponentWeights.github,
      rawScore: githubResult.score,
      weightedScore: githubResult.score * ComponentWeights.github,
      details: githubResult.details,
      evidence: githubResult.strengths,
    },
    {
      name: "Behavior",
      weight: ComponentWeights.behavior,
      rawScore: behaviorResult.score,
      weightedScore: behaviorResult.score * ComponentWeights.behavior,
      details: behaviorResult.details,
      evidence: behaviorResult.strengths,
    },
  ];

  const overallScore = clamp(Math.round(components.reduce((sum, c) => sum + c.weightedScore, 0)));
  const confidence = computeConfidence(components);

  const allStrengths = deduplicate([
    ...resumeResult.strengths,
    ...interviewResult.strengths,
    ...githubResult.strengths,
    ...behaviorResult.strengths,
  ]);
  const allGaps = deduplicate([
    ...resumeResult.gaps,
    ...interviewResult.gaps,
    ...githubResult.gaps,
    ...behaviorResult.gaps,
  ]);
  const explanation = generateExplanation(overallScore, components, confidence);

  const saved = await matchRepo.upsertCandidateMatch({
    jobId,
    applicationId,
    userId,
    overallScore,
    resumeScore: resumeResult.score,
    interviewScore: interviewResult.score,
    githubScore: githubResult.score,
    behaviorScore: behaviorResult.score,
    confidence,
    strengths: allStrengths,
    gaps: allGaps,
    explanation,
  });

  const response: CandidateMatchResponse = {
    id: saved.id,
    jobId: saved.jobId,
    applicationId: saved.applicationId,
    userId: saved.userId,
    applicantName: app.user.name,
    applicantEmail: app.user.email,
    overallScore: saved.overallScore,
    confidence: saved.confidence,
    components,
    strengths: allStrengths,
    gaps: allGaps,
    explanation: saved.explanation || "",
    createdAt: saved.createdAt.toISOString(),
  };

  eventBus.emit(Events.MATCH_COMPUTED, {
    jobId,
    applicationId,
    userId,
    overallScore,
    confidence,
    strengths: allStrengths,
    gaps: allGaps,
  });

  logger.info("Candidate match computed", {
    jobId,
    applicationId,
    overallScore,
    confidence,
  });

  return { status: true as const, match: response };
};

export const matchAllForJob = async (jobId: string) => {
  const job = await matchRepo.findJobById(jobId);
  if (!job) {
    return { status: false as const, message: "Job not found" };
  }

  const results: CandidateMatchResponse[] = [];

  for (const app of job.applications) {
    try {
      const result = await matchApplication(jobId, app.id);
      if (result.status && result.match) {
        results.push(result.match);
      }
    } catch (error) {
      logger.error("Failed to match application", {
        applicationId: app.id,
        error: (error as Error).message,
      });
    }
  }

  results.sort((a, b) => b.overallScore - a.overallScore);

  return { status: true as const, matches: results };
};

export const getRankings = async (jobId: string, requestingUserId: string) => {
  const job = await matchRepo.findJobById(jobId);
  if (!job) {
    return { status: false as const, message: "Job not found" };
  }

  if (job.createdById !== requestingUserId) {
    return { status: false as const, message: "Forbidden" };
  }

  let matches = await matchRepo.findRankingsByJob(jobId);

  if (matches.length === 0) {
    const result = await matchAllForJob(jobId);
    if (!result.status) return result;
    return { status: true as const, rankings: result.matches };
  }

  const rankings: CandidateMatchResponse[] = matches.map((m) => ({
    id: m.id,
    jobId: m.jobId,
    applicationId: m.applicationId,
    userId: m.userId,
    applicantName: m.application.user.name,
    applicantEmail: m.application.user.email,
    overallScore: m.overallScore,
    confidence: m.confidence,
    components: [],
    strengths: m.strengths as string[],
    gaps: m.gaps as string[],
    explanation: m.explanation || "",
    createdAt: m.createdAt.toISOString(),
  }));

  return { status: true as const, rankings };
};

export const getCandidateMatch = async (jobId: string, applicationId: string) => {
  const match = await matchRepo.findCandidateMatch(jobId, applicationId);
  if (!match) {
    return { status: false as const, message: "Match not found. Run POST /match first." };
  }

  const response: CandidateMatchResponse = {
    id: match.id,
    jobId: match.jobId,
    applicationId: match.applicationId,
    userId: match.userId,
    applicantName: match.application.user.name,
    applicantEmail: match.application.user.email,
    overallScore: match.overallScore,
    confidence: match.confidence,
    components: [],
    strengths: match.strengths as string[],
    gaps: match.gaps as string[],
    explanation: match.explanation || "",
    createdAt: match.createdAt.toISOString(),
  };

  return { status: true as const, match: response };
};
