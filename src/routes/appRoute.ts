import express from 'express'
import { authMiddleware } from '../middleware/authMiddleware';
import { applyForJob, getApplicationsByJob, getApplicationsByUser, changeStatus } from '../controllers/appController';
import upload from '../middleware/upload';

const appRoute = express.Router();

appRoute.post("/", authMiddleware(["APPLICANT"]), upload.single("resume"), applyForJob);
appRoute.get("/:userId", authMiddleware(), getApplicationsByUser);
appRoute.get("/job/:jobId", authMiddleware(["EMPLOYER"]), getApplicationsByJob);
appRoute.post('/status/:appId', authMiddleware(["EMPLOYER"]), changeStatus);


export default appRoute