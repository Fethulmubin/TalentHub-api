import { Response } from "express";
import { Request } from "../../shared/types";
import * as chatbotService from "./chatbot.service";
import { ChatQueryDto } from "./chatbot.dto";

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
  const parsed = ChatQueryDto.parse(req.body);
  const result = await chatbotService.answerQuestion(parsed);
  res.json(result);
};
