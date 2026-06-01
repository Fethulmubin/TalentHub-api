import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware";
import * as controller from "./interview.controller";

const router = Router();

router.post("/sessions", authenticate(), controller.createSession);
router.get("/sessions", authenticate(), controller.getUserSessions);
router.get("/sessions/:sessionId", authenticate(), controller.getSession);
router.patch("/sessions/:sessionId/status", authenticate(), controller.updateSessionStatus);
router.post("/sessions/:sessionId/start", authenticate(), controller.startSession);
router.post("/sessions/:sessionId/submit", authenticate(), controller.submitCode);
router.post("/sessions/:sessionId/voice", authenticate(), controller.submitVoice);
router.post("/sessions/:sessionId/evaluate", authenticate(), controller.finalizeEvaluation);

export default router;
