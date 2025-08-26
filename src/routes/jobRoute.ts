import express from 'express';
import { createJob, getJobById, getJobs, getJobsByUserId } from '../controllers/jobsController';
import { authMiddleware } from '../middleware/authMiddleware';

const jobsRouter = express.Router();
jobsRouter.get('/', getJobs);
jobsRouter.get('/:jobId', getJobById);
jobsRouter.get('/user/:userId', authMiddleware(["EMPLOYER"]), getJobsByUserId);
jobsRouter.post('/createJob', authMiddleware(["EMPLOYER"]), createJob);

export default jobsRouter;