import { eventBus, Events } from "../../shared/events/eventBus";
import logger from "../../shared/logger/logger";
import * as interviewRepo from "./interview.repository";
import { executeCodeInDocker } from "./interview.execution";
import { evaluateCoding, evaluateOral, InterviewEvaluator } from "./interview.evaluation";
import {
  CreateSessionInput,
  UpdateSessionInput,
  SubmitCodeInput,
  SubmitVoiceInput,
  SessionResponse,
  EvaluationResult,
} from "./interview.dto";

const CHALLENGE_TEMPLATES = [
  {
    prompt: `Write a function called solution that takes an array of integers and returns the sum of all even numbers in the array.

Examples:
- solution([1, 2, 3, 4, 5]) => 6
- solution([2, 4, 6, 8]) => 20
- solution([1, 3, 5]) => 0`,
    starterCode: `function solution(arr) {
  // Your code here
}`,
    testCases: [
      { input: JSON.stringify([1, 2, 3, 4, 5]), expected: "6" },
      { input: JSON.stringify([2, 4, 6, 8]), expected: "20" },
      { input: JSON.stringify([1, 3, 5]), expected: "0" },
      { input: JSON.stringify([]), expected: "0" },
      { input: JSON.stringify([-2, -1, 0, 1, 2]), expected: "0" },
    ],
  },
  {
    prompt: `Write a function called solution that takes a string and returns true if it is a palindrome, false otherwise. Ignore case, spaces, and punctuation.

Examples:
- solution("racecar") => true
- solution("hello") => false
- solution("A man a plan a canal Panama") => true`,
    starterCode: `function solution(str) {
  // Your code here
}`,
    testCases: [
      { input: JSON.stringify("racecar"), expected: "true" },
      { input: JSON.stringify("hello"), expected: "false" },
      { input: JSON.stringify("A man a plan a canal Panama"), expected: "true" },
      { input: JSON.stringify(""), expected: "true" },
      { input: JSON.stringify("12321"), expected: "true" },
    ],
  },
  {
    prompt: `Write a function called solution that takes an array of strings and groups anagrams together. Return an array of arrays.

Examples:
- solution(["eat", "tea", "tan", "ate", "nat", "bat"]) => [["eat","tea","ate"],["tan","nat"],["bat"]]
- solution([""]) => [[""]]
- solution(["a"]) => [["a"]]`,
    starterCode: `function solution(strs) {
  // Your code here
}`,
    testCases: [
      { input: JSON.stringify(["eat", "tea", "tan", "ate", "nat", "bat"]), expected: JSON.stringify([["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]) },
      { input: JSON.stringify([""]), expected: JSON.stringify([[""]]) },
      { input: JSON.stringify(["a"]), expected: JSON.stringify([["a"]]) },
    ],
  },
];

const ORAL_QUESTIONS = [
  "Explain the concept of closures in JavaScript and give a practical example.",
  "What is the difference between REST and GraphQL? When would you use each?",
  "Describe the event loop in JavaScript. How does async/await work?",
  "Explain the concept of normalization in databases and why it's important.",
  "What is Docker and how does it differ from a virtual machine?",
  "Describe the MVC architecture pattern and its benefits.",
  "Explain how garbage collection works in programming languages.",
  "What is the difference between SQL and NoSQL databases?",
  "Describe the concept of microservices and their advantages over monolithic architecture.",
  "Explain the OAuth2 authentication flow and its components.",
];

export const createSession = async (input: CreateSessionInput): Promise<SessionResponse> => {
  const existing = await interviewRepo.findSessionByApplicationId(input.applicationId);
  if (existing) {
    return {
      id: existing.id,
      applicationId: existing.applicationId,
      userId: existing.userId,
      jobId: existing.jobId,
      phase: existing.phase,
      status: existing.status,
      codingPrompt: existing.codingPrompt,
      starterCode: existing.starterCode,
      language: existing.language,
      timeLimit: existing.timeLimit,
      timeRemaining: existing.timeRemaining,
      startedAt: existing.startedAt,
      completedAt: existing.completedAt,
      codingScore: existing.codingScore,
      oralScore: existing.oralScore,
      overallScore: existing.overallScore,
      transcript: existing.transcript as unknown[],
      submissions: existing.submissions,
      createdAt: existing.createdAt,
    };
  }

  const session = await interviewRepo.createSession({
    applicationId: input.applicationId,
    userId: input.userId,
    jobId: input.jobId,
    language: input.language || "javascript",
    timeLimit: input.timeLimit || 3600,
  });

  logger.info("Interview session created", { sessionId: session.id, userId: input.userId });

  return {
    id: session.id,
    applicationId: session.applicationId,
    userId: session.userId,
    jobId: session.jobId,
    phase: session.phase,
    status: session.status,
    codingPrompt: session.codingPrompt,
    starterCode: session.starterCode,
    language: session.language,
    timeLimit: session.timeLimit,
    timeRemaining: session.timeRemaining,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    codingScore: session.codingScore,
    oralScore: session.oralScore,
    overallScore: session.overallScore,
    transcript: session.transcript as unknown[],
    submissions: session.submissions,
    createdAt: session.createdAt,
  };
};

export const getSession = async (sessionId: string) => {
  const session = await interviewRepo.findSessionById(sessionId);
  if (!session) {
    return { status: false as const, message: "Session not found" };
  }
  return { status: true as const, session };
};

export const getUserSessions = async (userId: string) => {
  const sessions = await interviewRepo.findUserSessions(userId);
  return { status: true as const, sessions };
};

export const updateSessionPhase = async (sessionId: string, input: UpdateSessionInput) => {
  const session = await interviewRepo.findSessionById(sessionId);
  if (!session) {
    return { status: false as const, message: "Session not found" };
  }

  const updated = await interviewRepo.updateSession(sessionId, input as Record<string, unknown>);

  logger.info("Interview session updated", { sessionId, phase: input.phase, status: input.status });

  return { status: true as const, session: updated };
};

export const startSession = async (sessionId: string) => {
  const session = await interviewRepo.findSessionById(sessionId);
  if (!session) {
    return { status: false as const, message: "Session not found" };
  }

  const challenge = CHALLENGE_TEMPLATES[Math.floor(Math.random() * CHALLENGE_TEMPLATES.length)];
  const oralQuestions = getRandomQuestions(ORAL_QUESTIONS, 3);

  const updated = await interviewRepo.updateSession(sessionId, {
    phase: "CODING",
    status: "IN_PROGRESS",
    codingPrompt: challenge.prompt,
    starterCode: challenge.starterCode,
    startedAt: new Date(),
    metadata: {
      challenge,
      oralQuestions,
      testCases: challenge.testCases,
    },
  });

  eventBus.emit(Events.INTERVIEW_STARTED, {
    sessionId,
    userId: session.userId,
    jobId: session.jobId,
  });

  logger.info("Interview session started", { sessionId });
  return { status: true as const, session: updated };
};

export const submitCode = async (input: SubmitCodeInput) => {
  const session = await interviewRepo.findSessionById(input.sessionId);
  if (!session) {
    return { status: false as const, message: "Session not found" };
  }

  const submission = await interviewRepo.createSubmission({
    sessionId: input.sessionId,
    code: input.code,
    language: input.language,
    questionId: input.questionId,
  });

  await interviewRepo.updateSubmission(submission.id, { status: "RUNNING" });

  try {
    const metadata = (session.metadata as { testCases?: { input?: string; expected?: string }[] }) || {};
    const testCases = metadata.testCases || CHALLENGE_TEMPLATES[0].testCases;

    const execResult = await executeCodeInDocker(input.code, input.language, testCases);

    const passed = execResult.results.filter((r) => r.passed).length;
    const total = execResult.results.length;

    await interviewRepo.createTestResult(
      execResult.results.map((r) => {
        const tc = testCases[r.testIndex];
        return {
          submissionId: submission.id,
          sessionId: input.sessionId,
          testIndex: r.testIndex,
          name: `Test ${r.testIndex + 1}`,
          passed: r.passed,
          input: tc?.input ?? undefined,
          expected: r.expected ?? undefined,
          actual: r.actual ?? undefined,
          error: r.error ?? undefined,
          duration: r.duration ?? undefined,
        };
      })
    );

    const codingScore = evaluateCoding({
      testPassRate: passed,
      testTotal: total,
      code: input.code,
      language: input.language,
    });

    await interviewRepo.updateSubmission(submission.id, {
      status: passed === total ? "PASSED" : "FAILED",
      output: execResult.overallOutput,
      errorOutput: execResult.overallError,
      testPassed: passed,
      testTotal: total,
      score: codingScore.overall,
      executedAt: new Date(),
    });

    await interviewRepo.updateSession(input.sessionId, {
      codingScore: codingScore.overall,
    });

    eventBus.emit(Events.CODE_SUBMITTED, {
      sessionId: input.sessionId,
      submissionId: submission.id,
      userId: session.userId,
      passed: passed === total,
      score: codingScore.overall,
    });

    logger.info("Code submission evaluated", {
      sessionId: input.sessionId,
      submissionId: submission.id,
      passed,
      total,
      score: codingScore.overall,
    });

    return {
      status: true as const,
      submission: {
        id: submission.id,
        passed,
        total,
        testPassRate: codingScore.testPassRate,
        output: execResult.overallOutput,
        error: execResult.overallError,
        results: execResult.results,
        score: codingScore,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Execution error";

    await interviewRepo.updateSubmission(submission.id, {
      status: "ERROR",
      errorOutput: errorMessage,
      executedAt: new Date(),
    });

    logger.error("Code execution failed", { sessionId: input.sessionId, submissionId: submission.id, error: errorMessage });

    return {
      status: false as const,
      message: "Code execution failed",
      error: errorMessage,
      submission: { id: submission.id },
    };
  }
};

export const submitVoiceTranscript = async (input: SubmitVoiceInput) => {
  const session = await interviewRepo.findSessionById(input.sessionId);
  if (!session) {
    return { status: false as const, message: "Session not found" };
  }

  const currentTranscript = (session.transcript as unknown[]) || [];
  const updatedTranscript = [
    ...currentTranscript,
    { type: "voice", text: input.transcript, timestamp: new Date() },
  ];

  const metadata = (session.metadata as { oralQuestions?: string[] }) || {};
  const currentQuestion = metadata.oralQuestions?.[0] || "";

  const oralScore = evaluateOral({
    transcript: input.transcript,
    question: currentQuestion,
  });

  await interviewRepo.updateSession(input.sessionId, {
    transcript: updatedTranscript,
    oralScore: oralScore.overall,
  });

  eventBus.emit(Events.ORAL_RESPONSE_SUBMITTED, {
    sessionId: input.sessionId,
    userId: session.userId,
    score: oralScore.overall,
  });

  logger.info("Voice transcript evaluated", {
    sessionId: input.sessionId,
    score: oralScore.overall,
  });

  return {
    status: true as const,
    score: oralScore,
    transcriptIndex: updatedTranscript.length - 1,
  };
};

export const finalizeEvaluation = async (sessionId: string) => {
  const session = await interviewRepo.findSessionById(sessionId);
  if (!session) {
    return { status: false as const, message: "Session not found" };
  }

  const codingScore = session.codingScore || 0;
  const oralScore = session.oralScore || 0;
  const overallScore = Math.round(codingScore * 0.5 + oralScore * 0.5);

  await interviewRepo.updateSession(sessionId, {
    phase: "COMPLETED",
    status: "COMPLETED",
    overallScore,
    completedAt: new Date(),
  });

  eventBus.emit(Events.INTERVIEW_COMPLETED, {
    sessionId,
    userId: session.userId,
    jobId: session.jobId,
    applicationId: session.applicationId,
    overallScore,
    codingScore,
    oralScore,
  });

  logger.info("Interview completed", { sessionId, overallScore });

  return {
    status: true as const,
    evaluation: {
      codingScore,
      oralScore,
      overallScore,
    },
  };
};

function getRandomQuestions(questions: string[], count: number): string[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length));
}
