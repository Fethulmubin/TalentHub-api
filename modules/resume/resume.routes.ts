import { Router } from "express";
import * as resumeController from "./resume.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import { SearchResumesDto } from "./resume.dto";
import localUpload from "../../shared/middleware/localUpload.middleware";

const router = Router();

router.post("/process", authenticate(["EMPLOYER", "APPLICANT"]), localUpload.single("resume"), resumeController.processResume);
router.get("/profile/:id", authenticate(), resumeController.getProfile);
router.post("/search", authenticate(["EMPLOYER"]), validate(SearchResumesDto), resumeController.searchResumes);

export default router;
