import dotenv from "dotenv";

dotenv.config();

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value || String(fallback), 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

export const env = {
  PORT: parsePort(process.env.PORT, 5001),
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

export function validateEnv(): void {
  if (!env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set. AI features will not work.");
  }
}
