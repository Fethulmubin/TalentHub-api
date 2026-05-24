import { Router } from "express";
import * as jobsController from "./jobs.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import { CreateJobDto } from "./jobs.dto";

const router = Router();

router.get("/", jobsController.getJobs);
router.get("/:jobId", jobsController.getJobById);
router.get("/user/:userId", authenticate(["EMPLOYER"]), jobsController.getJobsByUserId);
router.post("/createJob", authenticate(["EMPLOYER"]), validate(CreateJobDto), jobsController.createJob);

export default router;
