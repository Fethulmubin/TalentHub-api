import { Request } from "express";

export interface JwtPayload {
  id: string;
  email: string;
  role: "APPLICANT" | "EMPLOYER";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface ApiResponse<T = unknown> {
  status: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export type Role = "APPLICANT" | "EMPLOYER";
export type AppStatus = "APPLIED" | "SHORTLISTED" | "REJECTED";

export type { Request };
