import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, ".env"), override: true });

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

if (!process.env.ALLOWED_ORIGINS) {
  throw new Error("ALLOWED_ORIGINS environment variable is required");
}



const port = process.env.API_PORT || process.env.PORT || "3007";
const rawApiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
const normalizedApiBaseUrl = rawApiBaseUrl.startsWith("http://") || rawApiBaseUrl.startsWith("https://")
  ? rawApiBaseUrl
  : `http://${rawApiBaseUrl}`;

export const config = {
  port: parseInt(port, 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS.split(","),
  isProd: process.env.NODE_ENV !== "development",
  jwtSecret: process.env.JWT_SECRET,
  logLevel: process.env.LOG_LEVEL || "info",
  logServiceHost: process.env.LOGS_SERVICE_HOST || "localhost",
  logServicePort: parseInt(process.env.LOGS_SERVICE_PORT || "3500", 10),
  apiBaseUrl: normalizedApiBaseUrl.replace(/\/$/, ""),
  // Nouvel objet pour lire les paramètres de messagerie dynamiques depuis Docker
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM
  }
};