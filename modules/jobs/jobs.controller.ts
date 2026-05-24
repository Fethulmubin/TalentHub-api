import { Response } from "express";
import { Request } from "../../shared/types";
import * as jobsService from "./jobs.service";
import { CreateJobDto, JobQueryDto } from "./jobs.dto";

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  const query = JobQueryDto.parse(req.query);
  const result = await jobsService.getJobs(query);
  res.json(result);
};

export const getJobById = async (req: Request, res: Response): Promise<void> => {
  const jobId = String(req.params.jobId);
  const result = await jobsService.getJobById(jobId);
  if (!result.status) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
};

export const getJobsByUserId = async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.params.userId);
  const result = await jobsService.getJobsByUserId(userId);
  res.json(result);
};

export const createJob = async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateJobDto.parse(req.body);
  const result = await jobsService.createJob({ ...parsed, userId: req.user!.id });
  res.status(201).json(result);
};
