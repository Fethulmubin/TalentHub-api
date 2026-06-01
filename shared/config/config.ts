import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3500", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    secret: process.env.JWT_SECRET || "Alhamdulillah",
    expiresIn: "7d" as const,
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || "https://talent-hub-front-cckb.vercel.app,http://localhost:3000").split(","),
    credentials: true as const,
  },

  database: {
    url: process.env.DATABASE_URL || "",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },

  email: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },

  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
    otpTtl: 300,
  },

  docker: {
    socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
    memoryLimit: 256 * 1024 * 1024,
    cpuQuota: 50000,
    cpuPeriod: 100000,
    execTimeout: 30000,
  },
} as const;

export type Config = typeof config;
