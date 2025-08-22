import express from 'express';
import { createJob, getJobs } from '../controllers/jobsController';
import { authMiddleware } from '../middleware/authMiddleware';

const jobsRouter = express.Router();
jobsRouter.get('/', getJobs);
// jobsRouter.get('/search', searchJobs);
jobsRouter.post('/createJob', authMiddleware(["EMPLOYER"]), createJob);

export default jobsRouter;