import { EventEmitter } from "events";

export enum Events {
  USER_REGISTERED = "user.registered",
  USER_VERIFIED = "user.verified",
  JOB_CREATED = "job.created",
  APPLICATION_SUBMITTED = "application.submitted",
  APPLICATION_STATUS_UPDATED = "application.status.updated",
  RESUME_UPLOADED = "resume.uploaded",
  RESUME_PROCESSED = "resume.processed",
  MATCH_COMPUTED = "match.computed",
  INTERVIEW_STARTED = "interview.started",
  INTERVIEW_COMPLETED = "interview.completed",
  CODE_SUBMITTED = "code.submitted",
  ORAL_RESPONSE_SUBMITTED = "oral.response.submitted",
}

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name: string;
}

export interface UserVerifiedPayload {
  userId: string;
  email: string;
  name: string;
}

export interface JobCreatedPayload {
  jobId: string;
  employerId: string;
  title: string;
}

export interface ApplicationSubmittedPayload {
  appId: string;
  jobId: string;
  userId: string;
  jobTitle: string;
  applicantName: string;
  employerEmail: string;
}

export interface ApplicationStatusUpdatedPayload {
  appId: string;
  status: string;
  userId: string;
  jobTitle: string;
  applicantEmail: string;
}

export interface ResumeUploadedPayload {
  resumeId: string;
  fileName: string;
}

export interface ResumeProcessedPayload {
  resumeId: string;
  userId?: string;
  skills: string[];
  yearsExperience: number | null;
}

export interface MatchComputedPayload {
  jobId: string;
  applicationId: string;
  userId: string;
  overallScore: number;
  confidence: number;
  strengths: string[];
  gaps: string[];
}

export interface InterviewStartedPayload {
  sessionId: string;
  userId: string;
  jobId: string;
}

export interface InterviewCompletedPayload {
  sessionId: string;
  userId: string;
  jobId: string;
  applicationId: string;
  overallScore: number;
  codingScore: number;
  oralScore: number;
}

export interface CodeSubmittedPayload {
  sessionId: string;
  submissionId: string;
  userId: string;
  passed: boolean;
  score: number;
}

export interface OralResponseSubmittedPayload {
  sessionId: string;
  userId: string;
  score: number;
}

type EventPayloads = {
  [Events.USER_REGISTERED]: UserRegisteredPayload;
  [Events.USER_VERIFIED]: UserVerifiedPayload;
  [Events.JOB_CREATED]: JobCreatedPayload;
  [Events.APPLICATION_SUBMITTED]: ApplicationSubmittedPayload;
  [Events.APPLICATION_STATUS_UPDATED]: ApplicationStatusUpdatedPayload;
  [Events.RESUME_UPLOADED]: ResumeUploadedPayload;
  [Events.RESUME_PROCESSED]: ResumeProcessedPayload;
  [Events.MATCH_COMPUTED]: MatchComputedPayload;
  [Events.INTERVIEW_STARTED]: InterviewStartedPayload;
  [Events.INTERVIEW_COMPLETED]: InterviewCompletedPayload;
  [Events.CODE_SUBMITTED]: CodeSubmittedPayload;
  [Events.ORAL_RESPONSE_SUBMITTED]: OralResponseSubmittedPayload;
};

class TypedEventEmitter {
  private emitter = new EventEmitter();

  emit<E extends Events>(event: E, payload: EventPayloads[E]): boolean {
    return this.emitter.emit(event, payload);
  }

  on<E extends Events>(event: E, listener: (payload: EventPayloads[E]) => void): void {
    this.emitter.on(event, listener);
  }

  off<E extends Events>(event: E, listener: (payload: EventPayloads[E]) => void): void {
    this.emitter.off(event, listener);
  }

  removeAllListeners(event?: Events): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

export const eventBus = new TypedEventEmitter();
