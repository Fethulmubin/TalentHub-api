import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { JwtPayload, Request } from "../types";
import logger from "../logger/logger";

export const authenticate = (roles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ status: false, message: "Not authenticated" });
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        res.status(403).json({ status: false, message: "Forbidden: insufficient rights" });
        return;
      }

      next();
    } catch (error) {
      logger.warn("Invalid token attempt", { error });
      res.status(401).json({ status: false, message: "Invalid or expired token" });
    }
  };
};
