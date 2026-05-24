import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { config } from "../../shared/config/config";
import logger from "../../shared/logger/logger";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadFile = async (
  filePath: string,
  folder = "resumes"
): Promise<string> => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "raw",
  });
  logger.info("File uploaded to Cloudinary", { url: result.secure_url });
  return result.secure_url;
};

export const deleteFile = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
  logger.info("File deleted from Cloudinary", { publicId });
};

export const removeLocalFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug("Local file removed", { filePath });
    }
  } catch (err) {
    logger.warn("Failed to remove local file", { filePath, error: (err as Error).message });
  }
};

export { cloudinary };
