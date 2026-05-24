import { Router } from "express";
import * as chatbotController from "./chatbot.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import { ChatQueryDto } from "./chatbot.dto";

const router = Router();

router.post("/ask", authenticate(["EMPLOYER"]), validate(ChatQueryDto), chatbotController.askQuestion);

export default router;
