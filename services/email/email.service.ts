import nodemailer from "nodemailer";
import { config } from "../../shared/config/config";
import logger from "../../shared/logger/logger";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export const sendOtpEmail = async (toEmail: string, name: string, otp: string): Promise<void> => {
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify Your Email | TalentHub</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { background: #f4f4f7; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #333; }
    .container { max-width: 500px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 32px 24px; text-align: center; }
    h2 { color: #0078d4; margin-bottom: 16px; }
    p { font-size: 16px; line-height: 1.6; margin: 8px 0; }
    .otp { display: inline-block; background: #0078d4; color: #fff; font-size: 20px; font-weight: bold; padding: 12px 24px; border-radius: 6px; margin: 16px 0; letter-spacing: 2px; }
    .footer { font-size: 13px; color: #888; margin-top: 24px; }
    @media (max-width: 500px) { .container { padding: 24px 16px; } .otp { padding: 10px 20px; font-size: 18px; } }
  </style>
</head>
<body>
  <div class="container">
    <h2>TalentHub Job Application</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Use the OTP below to verify your email and complete your registration:</p>
    <div class="otp">${otp}</div>
    <p>If you did not request this, you can safely ignore this email.</p>
    <div class="footer">&copy; 2025 TalentHub. All rights reserved.</div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"TalentHub" <${config.email.user}>`,
      to: toEmail,
      subject: "Verify Your Email | TalentHub",
      html: htmlContent,
    });

    logger.info("OTP email sent", { to: toEmail });
  } catch (error) {
    logger.warn("Failed to send OTP email, OTP logged to console", { to: toEmail, error });
    console.log("============================================");
    console.log(`OTP for ${toEmail}: ${otp}`);
    console.log("============================================");
  }
};

export const sendStatusUpdateEmail = async (
  toEmail: string,
  name: string,
  jobTitle: string,
  status: string
): Promise<void> => {
  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Application Status Update | TalentHub</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>TalentHub</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>Your application for <strong>${jobTitle}</strong> has been updated to: <strong>${status}</strong>.</p>
  <p>Log in to your dashboard for more details.</p>
  <hr/><small>&copy; 2025 TalentHub</small>
</body>
</html>`;

  await transporter.sendMail({
    from: `"TalentHub" <${config.email.user}>`,
    to: toEmail,
    subject: `Application Status Update - ${jobTitle}`,
    html: htmlContent,
  });

  logger.info("Status update email sent", { to: toEmail, jobTitle, status });
};
