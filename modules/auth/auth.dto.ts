import { z } from "zod";

export const SignupDto = z.object({
  name: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[a-z]/, "Lowercase letter required")
    .regex(/[A-Z]/, "Uppercase letter required")
    .regex(/\d/, "Number required")
    .regex(/[@$!%*?&]/, "Special character required"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
  role: z.enum(["APPLICANT", "EMPLOYER"]).optional().default("APPLICANT"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const LoginDto = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const VerifyOtpDto = z.object({
  otpInput: z.string().length(6, "OTP must be exactly 6 characters"),
});

export type SignupInput = z.infer<typeof SignupDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpDto>;
