import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен — скопируй .env.example в .env"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET должен быть не короче 16 символов"),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Sign in with Apple: Services ID (или bundle ID для нативного iOS-флоу) из Apple Developer.
  // Пока не задан — /auth/apple отвечает 501, а не падает.
  APPLE_CLIENT_ID: z.string().optional(),

  // Google Sign-In: OAuth client ID из Google Cloud Console (тот, что указан как audience
  // в ID-токене — обычно Web client ID, даже при входе с мобильного клиента).
  // Пока не задан — /auth/google отвечает 501, а не падает.
  GOOGLE_CLIENT_ID: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
