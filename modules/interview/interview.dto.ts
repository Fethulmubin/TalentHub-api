export enum InterviewPhase {
  GREETING = "GREETING",
  CODING = "CODING",
  ORAL = "ORAL",
  EVALUATION = "EVALUATION",
  COMPLETED = "COMPLETED",
}

export enum SubmissionStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  PASSED = "PASSED",
  FAILED = "FAILED",
  ERROR = "ERROR",
}

export interface CreateSessionInput {
  applicationId: string;
  userId: string;
  jobId: string;
  language?: string;
  timeLimit?: number;
}

export interface UpdateSessionInput {
  phase?: InterviewPhase;
  status?: string;
  codingPrompt?: string;
  starterCode?: string;
  timeRemaining?: number;
  codingScore?: number;
  oralScore?: number;
  overallScore?: number;
  transcript?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface SubmitCodeInput {
  sessionId: string;
  code: string;
  language: string;
  questionId?: string;
}

export interface SubmitVoiceInput {
  sessionId: string;
  transcript: string;
  questionId?: string;
}

export interface SessionResponse {
  id: string;
  applicationId: string;
  userId: string;
  jobId: string;
  phase: string;
  status: string;
  codingPrompt: string | null;
  starterCode: string | null;
  language: string;
  timeLimit: number;
  timeRemaining: number;
  startedAt: Date | null;
  completedAt: Date | null;
  codingScore: number;
  oralScore: number;
  overallScore: number;
  transcript: unknown[];
  submissions: unknown[];
  createdAt: Date;
}

export interface EvaluationResult {
  codingScore: {
    overall: number;
    testPassRate: number;
    codeQuality: number;
    efficiency: number;
    explanation: string;
  };
  oralScore: {
    overall: number;
    fluency: number;
    accuracy: number;
    relevance: number;
    clarity: number;
    explanation: string;
  };
  overallScore: number;
}

export interface TestCaseResult {
  testIndex: number;
  name: string | null;
  passed: boolean;
  input: string | null;
  expected: string | null;
  actual: string | null;
  error: string | null;
  duration: number | null;
}
