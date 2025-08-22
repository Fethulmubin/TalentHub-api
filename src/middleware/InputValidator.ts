// src/middleware/validators/userValidator.ts
import { body } from 'express-validator';

export const validateSignup = [
    body('name').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password')
        .isLength({ min: 8 }).withMessage('At least 8 characters')
        .matches(/[a-z]/).withMessage('Lowercase letter required')
        .matches(/[A-Z]/).withMessage('Uppercase letter required')
        .matches(/\d/).withMessage('Number required')
        .matches(/[@$!%*?&]/).withMessage('Special character required'),
    body('confirmPassword')
        .notEmpty().withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
];
export const validateLogin = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required')
];