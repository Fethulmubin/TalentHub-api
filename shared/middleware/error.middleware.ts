import { Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { ValidationError } from "../errors/ValidationError";
import { Request } from "../types";
import logger from "../logger/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      status: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: false,
      message: err.message,
    });
    return;
  }

  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    status: false,
    message: "Internal server error",
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  res.status(404).json({
    status: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};
