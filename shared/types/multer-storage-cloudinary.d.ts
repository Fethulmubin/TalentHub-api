declare module "multer-storage-cloudinary" {
  import { StorageEngine } from "multer";
  import { v2 as cloudinary } from "cloudinary";

  interface CloudinaryStorageOptions {
    cloudinary: typeof cloudinary;
    params?: Record<string, any>;
  }

  function CloudinaryStorage(options?: CloudinaryStorageOptions): StorageEngine;
  export default CloudinaryStorage;
}
