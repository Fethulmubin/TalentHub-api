import { Response } from "express";
import { Request } from "../../shared/types";
import * as authService from "./auth.service";
import { SignupDto, LoginDto, VerifyOtpDto } from "./auth.dto";

export const signup = async (req: Request, res: Response): Promise<void> => {
  const parsed = SignupDto.parse(req.body);
  const result = await authService.signup(parsed);

  if (!result.status) {
    res.status(400).json(result);
    return;
  }

  res.status(200).json(result);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginDto.parse(req.body);
  const result = await authService.login(parsed);

  if (!result.status) {
    res.status(400).json(result);
    return;
  }

  res.cookie("token", result.token, authService.cookieOptions);
  res.status(200).json(result);
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const parsed = VerifyOtpDto.parse(req.body);
  const result = await authService.verifyOtp(parsed.otpInput);

  if (!result.status) {
    res.status(400).json(result);
    return;
  }

  res.cookie("token", result.token, authService.cookieOptions);
  res.status(201).json(result);
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie("token", authService.cookieOptions);
  res.status(200).json({ status: true, message: "Logged out successfully" });
};
