import { Response } from "express";
import { Request } from "../../shared/types";
import * as matchService from "./matching.service";
import logger from "../../shared/logger/logger";

function handleError(res: Response, error: unknown, context: string) {
  logger.error(`Matching error [${context}]`, {
    error: error instanceof Error ? error.message : String(error),
  });

  if (error instanceof Error && error.message.includes("candidateMatch")) {
    res.status(500).json({
      status: false,
      message: "Matching engine not ready. Run database migrations (npx prisma migrate dev) on the server.",
    });
    return;
  }

  if (error instanceof Error && error.message.includes("interviewScore")) {
    res.status(500).json({
      status: false,
      message: "Interview scores table not found. Run database migrations on the server.",
    });
    return;
  }

  res.status(500).json({
    status: false,
    message: "Internal server error. Please ensure database is up to date (npx prisma migrate dev).",
  });
}

export const matchCandidate = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.id);
    const { applicationId } = req.body;

    if (!applicationId) {
      res.status(400).json({ status: false, message: "applicationId is required" });
      return;
    }

    const result = await matchService.matchApplication(jobId, applicationId);
    if (!result.status) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, "matchCandidate");
  }
};

export const matchAllForJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.id);
    const result = await matchService.matchAllForJob(jobId);
    if (!result.status) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, "matchAllForJob");
  }
};

export const getRankings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: false, message: "Not authenticated" });
      return;
    }
    const jobId = String(req.params.id);
    const result = await matchService.getRankings(jobId, req.user.id);
    if (!result.status) {
      const statusCode = result.message === "Forbidden" ? 403 : 404;
      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, "getRankings");
  }
};

export const getCandidateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.id);
    const applicationId = String(req.params.applicationId);
    const result = await matchService.getCandidateMatch(jobId, applicationId);
    if (!result.status) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    handleError(res, error, "getCandidateMatch");
  }
};
