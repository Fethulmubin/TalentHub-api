import express from 'express';
import { Signup, Login, VerifyOTP } from '../controllers/userController';
import { body, validationResult } from 'express-validator';
import { validateLogin, validateSignup } from '../middleware/InputValidator';
import { validateRequest } from '../middleware/validatorMiddleware';
// import { validateLogin, validateSignup } from '../middleware/inputValidator';

const userRoute = express.Router();

userRoute.post('/register', validateSignup, validateRequest , Signup);
userRoute.post('/login',validateLogin, validateRequest,  Login);
userRoute.post('/verify', VerifyOTP);

export default userRoute;