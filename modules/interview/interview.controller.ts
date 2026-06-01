import { Request, Response } from "express";
import * as interviewService from "./interview.service";

export const createSession = async (req: Request, res: Response) => {
  const { applicationId, language, timeLimit } = req.body;
  const userId = req.user!.id;
  const jobId = req.body.jobId;

  if (!applicationId || !jobId) {
    res.status(400).json({ status: false, message: "applicationId and jobId are required" });
    return;
  }

  const result = await interviewService.createSession({ applicationId, userId, jobId, language, timeLimit });
  res.status(201).json({ status: true, session: result });
};

export const getSession = async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const result = await interviewService.getSession(sessionId);
  res.json(result);
};

export const getUserSessions = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await interviewService.getUserSessions(userId);
  res.json(result);
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  const { phase, status, timeRemaining } = req.body;
  const sessionId = req.params.sessionId as string;
  const result = await interviewService.updateSessionPhase(sessionId, { phase, status, timeRemaining });
  res.json(result);
};

export const startSession = async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const result = await interviewService.startSession(sessionId);
  res.json(result);
};

export const submitCode = async (req: Request, res: Response) => {
  const { code, language, questionId } = req.body;
  const sessionId = req.params.sessionId as string;

  if (!code || !language) {
    res.status(400).json({ status: false, message: "code and language are required" });
    return;
  }

  const result = await interviewService.submitCode({ sessionId, code, language, questionId });
  res.json(result);
};

export const submitVoice = async (req: Request, res: Response) => {
  const { transcript, questionId } = req.body;
  const sessionId = req.params.sessionId as string;

  if (!transcript) {
    res.status(400).json({ status: false, message: "transcript is required" });
    return;
  }

  const result = await interviewService.submitVoiceTranscript({ sessionId, transcript, questionId });
  res.json(result);
};

export const finalizeEvaluation = async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const result = await interviewService.finalizeEvaluation(sessionId);
  res.json(result);
};
