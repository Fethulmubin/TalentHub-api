import multer, { FileFilterCallback } from "multer";
import { v2 as cloudinary } from "cloudinary";
import cloudinaryStorage from "multer-storage-cloudinary";
import { Request } from "express";
import { config } from "../config/config";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const storage = cloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => ({
    folder: "resumes",
    resource_type: "raw" as const,
    type: "upload" as const,
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: config.limits.fileSize },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

export { cloudinary };
export default upload;
