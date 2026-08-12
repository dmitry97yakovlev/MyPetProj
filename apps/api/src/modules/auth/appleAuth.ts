import jwt, { type JwtHeader, type SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { env } from "../../env";
import { AppError } from "../../errors";

const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER = "https://appleid.apple.com";

const client = jwksClient({ jwksUri: APPLE_KEYS_URL, cache: true, cacheMaxAge: 60 * 60 * 1000 });

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback) {
  if (!header.kid) {
    callback(new Error("Токен Apple без kid"));
    return;
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error("Не удалось получить ключ Apple"));
      return;
    }
    callback(null, key.getPublicKey());
  });
}

export interface AppleTokenPayload {
  sub: string;
  email?: string;
}

/**
 * Проверяет identityToken, полученный от Sign in with Apple на клиенте.
 * Требует настроенный APPLE_CLIENT_ID (Services ID / bundle ID из Apple Developer).
 */
export function verifyAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
  if (!env.APPLE_CLIENT_ID) {
    throw new AppError(501, "Sign in with Apple не настроен на сервере (нет APPLE_CLIENT_ID)");
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getSigningKey,
      { algorithms: ["RS256"], issuer: APPLE_ISSUER, audience: env.APPLE_CLIENT_ID },
      (err, decoded) => {
        if (err || !decoded || typeof decoded === "string") {
          reject(new AppError(401, "Недействительный токен Apple"));
          return;
        }
        resolve({ sub: decoded.sub as string, email: decoded.email as string | undefined });
      },
    );
  });
}
