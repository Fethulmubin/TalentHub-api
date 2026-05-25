import { Router } from "express";
import * as matchController from "./matching.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";

const router = Router();

router.post("/:id/match", authenticate(["EMPLOYER"]), matchController.matchCandidate);
router.post("/:id/match-all", authenticate(["EMPLOYER"]), matchController.matchAllForJob);
router.get("/:id/match/:applicationId", authenticate(["EMPLOYER"]), matchController.getCandidateMatch);
router.get("/:id/rankings", authenticate(["EMPLOYER"]), matchController.getRankings);

export default router;
