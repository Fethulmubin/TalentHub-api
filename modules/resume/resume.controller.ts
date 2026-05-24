import { Response } from "express";
import { Request } from "../../shared/types";
import * as resumeService from "./resume.service";
import { SearchResumesDto } from "./resume.dto";

export const processResume = async (req: Request, res: Response): Promise<void> => {
  if (!req.file || !req.file.path) {
    res.status(400).json({ status: false, message: "Resume PDF is required" });
    return;
  }

  const result = await resumeService.processResume(
    req.file.path,
    req.file.originalname,
    req.user?.id
  );

  res.status(202).json(result);
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const result = await resumeService.getProfileById(id);
  if (!result.status) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
};

export const searchResumes = async (req: Request, res: Response): Promise<void> => {
  const parsed = SearchResumesDto.parse(req.body);
  const result = await resumeService.searchResumes(parsed);
  res.json(result);
};
