import { OAuth2Client } from "google-auth-library";
import { env } from "../../env";
import { AppError } from "../../errors";

export interface GoogleTokenPayload {
  sub: string;
  email?: string;
  name?: string;
}

/**
 * Проверяет idToken, полученный от Google Sign-In на клиенте.
 * Требует настроенный GOOGLE_CLIENT_ID (OAuth client ID из Google Cloud Console).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(501, "Google Sign-In не настроен на сервере (нет GOOGLE_CLIENT_ID)");
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  } catch {
    throw new AppError(401, "Недействительный токен Google");
  }

  const payload = ticket.getPayload();
  if (!payload?.sub) throw new AppError(401, "Недействительный токен Google");

  return { sub: payload.sub, email: payload.email, name: payload.name };
}
