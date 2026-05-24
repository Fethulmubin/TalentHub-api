import { Job } from "bullmq";
import { parsePdf } from "../../services/resume/parser.service";
import { internalProcessResumeData } from "../../modules/resume/resume.service";
import { uploadFile, removeLocalFile } from "../../services/file/file.service";
import logger from "../../shared/logger/logger";

interface ResumeJobData {
  profileId: string;
  filePath: string;
  fileName: string;
  userId?: string;
  applicationId?: string;
}

export const processResumeJob = async (job: Job<ResumeJobData>): Promise<void> => {
  const { profileId, filePath, fileName, applicationId } = job.data;

  logger.info("Processing resume job started", { profileId, fileName, attempt: job.attemptsMade });

  try {
    const rawText = await parsePdf(filePath);

    let cloudinaryUrl: string | undefined;
    try {
      cloudinaryUrl = await uploadFile(filePath, "resumes");
    } catch (uploadErr) {
      logger.warn("Cloudinary upload failed, continuing without cloud storage", {
        error: (uploadErr as Error).message,
      });
    }

    const userId = job.data.userId;
    await internalProcessResumeData(profileId, rawText, cloudinaryUrl, userId);

    if (cloudinaryUrl && applicationId) {
      const prisma = (await import("../../shared/database/prisma")).default;
      await prisma.application.update({
        where: { id: applicationId },
        data: { resumeUrl: cloudinaryUrl },
      });
    }

    removeLocalFile(filePath);

    logger.info("Resume job completed", { profileId, cloudinaryUrl: !!cloudinaryUrl });
  } catch (err) {
    logger.error("Resume job failed", {
      profileId,
      error: (err as Error).message,
    });

    const prisma = (await import("../../shared/database/prisma")).default;
    await prisma.resumeProfile.update({
      where: { id: profileId },
      data: { status: "FAILED", errorMessage: (err as Error).message },
    });

    removeLocalFile(filePath);

    throw err;
  }
};
