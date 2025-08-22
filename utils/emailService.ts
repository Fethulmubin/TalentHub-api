import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (toEmail, name,  otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Verify Your Email',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Email Title</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body {
      background: #f4f4f7;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      padding: 32px 24px;
    }
    .header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 1px solid #eee;
    }
    .header img {
      max-width: 120px;
      margin-bottom: 8px;
    }
    .content {
      padding: 24px 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      background: #0078d4;
      color: #fff !important;
      padding: 12px 28px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      color: #888;
      font-size: 13px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    }
    @media (max-width: 600px) {
      .container { padding: 16px 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <!-- Optional: Your logo -->
      <img src="https://yourdomain.com/logo.png" alt="Logo" />
      <h2>Welcome to TalentHub!</h2>
    </div>
    <div class="content">
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for registering with us. Please verify your email address to complete your registration.</p>
      <p>Your OTP code is: <strong>${otp}</strong></p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,<br/>The Darul Hijretien Team</p>
    </div>
    <div class="footer">
      &copy; 2025 Darul Hijretien. All rights reserved.<br>
      <a href="https://yourdomain.com" style="color:#888;text-decoration:underline;">Visit our website</a>
    </div>
  </div>
</body>
</html>`,
  });
};

export {sendOTP};
