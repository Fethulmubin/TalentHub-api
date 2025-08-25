// src/middleware/authMiddleware.ts
import jwt from "jsonwebtoken";

export const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    // console.log(req.cookies)
    const token = req.cookies?.token;
    // console.log(token)
    if (!token) {
      return res.status(401).json({ status: false, message: "Not authenticated" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // role-based access control
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ status: false, message: "Forbidden: insufficient rights" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ status: false, message: "Invalid or expired token" });
    }
  };
};
