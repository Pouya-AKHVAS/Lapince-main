import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env"), override: true });

const adapter = new PrismaPg(process.env.DATABASE_URL!);

// On réexporte tous les modèles pour faciliter leur utilisatation dans le reste de l'application
export * from "@prisma/client";

export const prisma = new PrismaClient({ adapter });
