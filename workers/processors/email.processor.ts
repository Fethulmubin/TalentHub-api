import { Job } from "bullmq";
import { sendOtpEmail, sendStatusUpdateEmail } from "../../services/email/email.service";
import logger from "../../shared/logger/logger";

interface EmailJobData {
  type: "otp" | "status-update";
  to: string;
  name: string;
  otp?: string;
  jobTitle?: string;
  status?: string;
}

export const processEmailJob = async (job: Job<EmailJobData>): Promise<void> => {
  const { type, to, name, otp, jobTitle, status } = job.data;

  switch (type) {
    case "otp":
      if (!otp) throw new Error("OTP is required for otp email type");
      await sendOtpEmail(to, name, otp);
      break;

    case "status-update":
      if (!jobTitle || !status) throw new Error("jobTitle and status required for status-update email");
      await sendStatusUpdateEmail(to, name, jobTitle, status);
      break;

    default:
      logger.warn(`Unknown email job type: ${type}`);
  }
};
