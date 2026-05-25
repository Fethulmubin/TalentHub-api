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

type EventPayloads = {
  [Events.USER_REGISTERED]: UserRegisteredPayload;
  [Events.USER_VERIFIED]: UserVerifiedPayload;
  [Events.JOB_CREATED]: JobCreatedPayload;
  [Events.APPLICATION_SUBMITTED]: ApplicationSubmittedPayload;
  [Events.APPLICATION_STATUS_UPDATED]: ApplicationStatusUpdatedPayload;
  [Events.RESUME_UPLOADED]: ResumeUploadedPayload;
  [Events.RESUME_PROCESSED]: ResumeProcessedPayload;
  [Events.MATCH_COMPUTED]: MatchComputedPayload;
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
