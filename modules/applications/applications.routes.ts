import { Router } from "express";
import * as appController from "./applications.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import { ChangeStatusDto } from "./applications.dto";
import localUpload from "../../shared/middleware/localUpload.middleware";

const router = Router();

router.post("/", authenticate(["APPLICANT"]), localUpload.single("resume"), appController.applyForJob);
router.get("/:userId", authenticate(), appController.getApplicationsByUser);
router.get("/job/:jobId", authenticate(["EMPLOYER"]), appController.getApplicationsByJob);
router.post("/status/:appId", authenticate(["EMPLOYER"]), validate(ChangeStatusDto), appController.changeStatus);

export default router;
