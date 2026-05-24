import { Response } from "express";
import { Request } from "../../shared/types";
import * as appService from "./applications.service";
import { ChangeStatusDto } from "./applications.dto";

export const getApplicationsByUser = async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.params.userId);
  const result = await appService.getApplicationsByUser(
    userId,
    req.user!.id
  );
  if (!result.status) {
    res.status(403).json(result);
    return;
  }
  res.json(result);
};

export const applyForJob = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.body;

  if (!jobId) {
    res.status(400).json({ status: false, message: "Job ID is required" });
    return;
  }

  if (!req.file || !req.file.path) {
    res.status(400).json({ status: false, message: "Resume PDF is required" });
    return;
  }

  const result = await appService.applyForJob(jobId, req.user!.id, req.file.path, req.file.originalname);

  if (!result.status) {
    const statusCode = result.message === "You already applied to this job" ? 409 : 404;
    res.status(statusCode).json(result);
    return;
  }

  res.status(201).json(result);
};

export const getApplicationsByJob = async (req: Request, res: Response): Promise<void> => {
  const jobIdParam = String(req.params.jobId);
  const result = await appService.getApplicationsByJob(
    jobIdParam,
    req.user!.id
  );
  if (!result.status) {
    const statusCode = result.message === "Forbidden" ? 403 : 404;
    res.status(statusCode).json(result);
    return;
  }
  res.json(result);
};

export const changeStatus = async (req: Request, res: Response): Promise<void> => {
  const parsed = ChangeStatusDto.parse(req.body);
  const appId = String(req.params.appId);
  const result = await appService.changeStatus(
    appId,
    parsed.status,
    req.user!.id
  );
  if (!result.status) {
    const statusCode = result.message === "Forbidden" ? 403 : 404;
    res.status(statusCode).json(result);
    return;
  }
  res.json(result);
};
