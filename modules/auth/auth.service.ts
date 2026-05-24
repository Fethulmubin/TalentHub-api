import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../shared/config/config";
import redis from "../../shared/database/redis";
import { sendOtpEmail } from "../../services/email/email.service";
import { eventBus, Events } from "../../shared/events/eventBus";
import logger from "../../shared/logger/logger";
import * as authRepo from "./auth.repository";
import { SignupInput, LoginInput } from "./auth.dto";

export const generateToken = (user: { id: string; email: string; role: string }): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export const cookieOptions = {
  httpOnly: config.cookie.httpOnly,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  maxAge: config.cookie.maxAge,
};

export const signup = async (input: SignupInput) => {
  const allowedRoles = ["APPLICANT", "EMPLOYER"] as const;
  const userRole = allowedRoles.includes(input.role as typeof allowedRoles[number])
    ? (input.role as "APPLICANT" | "EMPLOYER")
    : "APPLICANT";

  const existingUser = await authRepo.findUserByEmail(input.email);
  if (existingUser) {
    return { status: false as const, message: "User already exists" };
  }

  if (input.password !== input.confirmPassword) {
    return { status: false as const, message: "Passwords do not match" };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await redis.setex(
    `otp:${otp}`,
    config.limits.otpTtl,
    JSON.stringify({ name: input.name, email: input.email, hashedPassword, role: userRole, otp })
  );

  await sendOtpEmail(input.email, input.name, otp);

  eventBus.emit(Events.USER_REGISTERED, {
    userId: "",
    email: input.email,
    name: input.name,
  });

  logger.info("User registered (OTP sent)", { email: input.email });

  return { status: true as const, message: "OTP sent to your email. Proceed to verify.", otp };
};

export const login = async (input: LoginInput) => {
  const existingUser = await authRepo.findUserByEmail(input.email);
  if (!existingUser) {
    return { status: false as const, message: "User does not exist" };
  }

  const isPasswordValid = await bcrypt.compare(input.password, existingUser.password);
  if (!isPasswordValid) {
    return { status: false as const, message: "Invalid credentials" };
  }

  const token = generateToken(existingUser);

  logger.info("User logged in", { userId: existingUser.id });

  return {
    status: true as const,
    message: "Login successful",
    user: {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
    },
    token,
  };
};

export const verifyOtp = async (otpInput: string) => {
  const data = await redis.get(`otp:${otpInput}`);
  if (!data) {
    return { status: false as const, message: "OTP expired or not found" };
  }

  const otpData = typeof data === "string" ? JSON.parse(data) : data;
  const { name, email, hashedPassword, role, otp } = otpData;

  if (otpInput !== otp) {
    return { status: false as const, message: "Invalid OTP" };
  }

  const user = await authRepo.createUser({
    name,
    email,
    password: hashedPassword,
    role,
  });

  const token = generateToken(user);
  await redis.del(`otp:${otpInput}`);

  eventBus.emit(Events.USER_VERIFIED, {
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  logger.info("User verified", { userId: user.id });

  return {
    status: true as const,
    message: "Account created successfully",
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  };
};
