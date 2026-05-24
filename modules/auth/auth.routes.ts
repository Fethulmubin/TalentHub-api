import { Router } from "express";
import * as authController from "./auth.controller";
import { validate } from "../../shared/middleware/validate.middleware";
import { SignupDto, LoginDto, VerifyOtpDto } from "./auth.dto";

const router = Router();

router.post("/register", validate(SignupDto), authController.signup);
router.post("/login", validate(LoginDto), authController.login);
router.post("/verify", validate(VerifyOtpDto), authController.verifyOtp);
router.post("/logout", authController.logout);

export default router;
