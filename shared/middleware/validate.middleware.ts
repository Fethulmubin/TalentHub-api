import { Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { Request } from "../types";

type ValidationTarget = "body" | "query" | "params";

export const validate = (schema: ZodSchema, target: ValidationTarget = "body") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(issue.message);
        }
        res.status(400).json({
          status: false,
          message: "Validation failed",
          errors,
        });
        return;
      }
      next(error);
    }
  };
};
