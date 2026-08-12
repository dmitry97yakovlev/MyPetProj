import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../env";

const ACCESS_TOKEN_TTL = "15m";
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 30;

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
}

/** Непрозрачный refresh-токен: клиенту уходит сырой токен, на сервере хранится только его хэш. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * unlimitedSession = true  → null (сессия никогда не истекает)
 * unlimitedSession = false → обычный срок жизни (30 дней)
 */
export function refreshTokenExpiryDate(unlimitedSession: boolean): Date | null {
  if (unlimitedSession) return null;
  const expires = new Date();
  expires.setDate(expires.getDate() + DEFAULT_REFRESH_TOKEN_TTL_DAYS);
  return expires;
}
