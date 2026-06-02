import { Request, Response } from "express";
import * as interviewService from "./interview.service";
import { getCodeFeedback, answerChatQuestion } from "../../services/ai/openrouter.service";
import { getHistory, addMessage } from "../../shared/memory/conversationMemory";
import prisma from "../../shared/database/prisma";

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

export const chat = async (req: Request, res: Response) => {
  const { message, code, codingPrompt } = req.body;
  const sessionId = req.params.sessionId as string;

  if (!message) {
    res.status(400).json({ status: false, message: "message is required" });
    return;
  }

  try {
    let response: string;
    if (code) {
      response = await getCodeFeedback(code, req.body.language || "javascript", codingPrompt);
    } else {
      const sessionResult = await interviewService.getSession(sessionId);
      if (!sessionResult.status || !("session" in sessionResult) || !sessionResult.session) {
        res.status(404).json({ status: false, message: "Session not found" });
        return;
      }
      const session = sessionResult.session as any;
      const phase = session.phase;
      const prompt = session.codingPrompt || codingPrompt;

      let jobContext: { title: string; description: string; skills: string } | undefined;
      try {
        const job = await prisma.job.findUnique({
          where: { id: session.jobId },
          include: { skills: true },
        });
        if (job) {
          jobContext = {
            title: job.title,
            description: job.description || "",
            skills: (job.skills || []).map((s: any) => s.name || s.skill || "").join(", "),
          };
        }
      } catch {
        // job fetch failed, continue without context
      }

      const conversationHistory = await getHistory(sessionId);

      response = await answerChatQuestion(message, {
        phase,
        codingPrompt: prompt,
        jobContext,
        conversationHistory,
      });

      await addMessage(sessionId, "user", message);
      await addMessage(sessionId, "assistant", response);
    }

    res.json({ status: true, response });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message || "AI request failed" });
  }
};
