import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../../utils/prismaClient";
import redis  from "../../utils/redisClient";
import { sendOTP } from "../../utils/emailService";

// helper for token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false, // only HTTPS in prod
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ---------------- Signup ----------------
const Signup = async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;
  const allowedRoles = ["APPLICANT", "EMPLOYER"];
  const userRole = allowedRoles.includes(role) ? role : "APPLICANT";

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ status: false, message: "User already exists" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ status: false, message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(
      `otp:${otp}`,
      JSON.stringify({ name, email, hashedPassword, role: userRole, otp }),
      { ex: 300 }
    );

    await sendOTP(email, name, otp);

    return res.status(200).json({
      status: true,
      message: "OTP sent to your email. Proceed to verify.",
    });
  } catch (error) {
    console.error("Error in signup:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ---------------- Login ----------------
const Login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return res.status(400).json({ status: false, message: "User does not exist" });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({ status: false, message: "Invalid credentials" });
    }

    const token = generateToken(existingUser);

    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      status: true,
      message: "Login successful",
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ---------------- Verify OTP ----------------
const VerifyOTP = async (req, res) => {
  const { otpInput } = req.body;

  try {
  const data = await redis.get(`otp:${otpInput}`);
if (!data) return res.status(400).json({ status: false, message: "OTP expired or not found" });

// If data is a string, parse it; otherwise, use it directly
const otpData = typeof data === "string" ? JSON.parse(data) : data;

const { name, email, hashedPassword, role, otp } = otpData;

if (otpInput !== otp) {
  return res.status(400).json({ status: false, message: "Invalid OTP" });
}


    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    const token = generateToken(user);

    await redis.del(`otp:${otpInput}`);

    res.cookie("token", token, cookieOptions);

    return res.status(201).json({
      status: true,
      message: "Account created successfully",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ---------------- Logout ----------------
const Logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  return res.status(200).json({ status: true, message: "Logged out successfully" });
};

export { Signup, Login, VerifyOTP, Logout };
