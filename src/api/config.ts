import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// 1. Chargement du fichier .env uniquement en environnement de développement
if (process.env.NODE_ENV !== "production") {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: join(__dirname, "../.env"), override: true });
}

// 2. Validation des variables d'environnement critiques
if (!process.env.JWT_SECRET) {
  throw new Error("La variable d'environnement JWT_SECRET est requise");
}

if (!process.env.ALLOWED_ORIGINS) {
  throw new Error("La variable d'environnement ALLOWED_ORIGINS est requise");
}

// 3. Initialisation de la configuration complète
const port = process.env.API_PORT || process.env.PORT || "3007";

export const config = {
  port: parseInt(port, 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS.split(","),
  isProd: process.env.NODE_ENV === "production",
  jwtSecret: process.env.JWT_SECRET,
  
  // Paramètres de log (ajoutés selon votre code initial)
  logLevel: process.env.LOG_LEVEL || "info",
  logServiceHost: process.env.LOGS_SERVICE_HOST || "localhost",
  logServicePort: parseInt(process.env.LOGS_SERVICE_PORT || "3500", 10),
  
  apiBaseUrl: process.env.API_BASE_URL || "http://lapince.pooya-dev.com/api",
  
  // Paramètres de messagerie (SMTP)
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || "La Pince <contact@lapince.pooya-dev.com>"
  }
};