import type { AppleSignInInput, AuthResponse, GoogleSignInInput, LoginInput, RegisterInput } from "@mypetproj/shared";
import type { User } from "@prisma/client";
import { prisma } from "../../db";
import { verifyAppleIdentityToken } from "./appleAuth";
import { verifyGoogleIdToken } from "./googleAuth";
import { generateRefreshToken, hashRefreshToken, refreshTokenExpiryDate, signAccessToken } from "./jwt";
import { hashPassword, verifyPassword } from "./password";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface UserRecord {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

function toAuthUser(user: UserRecord) {
  return { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin };
}

async function issueSession(userId: string, unlimitedSession: boolean, userAgent?: string) {
  const refreshToken = generateRefreshToken();
  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiryDate(unlimitedSession),
      userAgent,
    },
  });
  return { accessToken: signAccessToken(userId), refreshToken };
}

export async function register(input: RegisterInput, userAgent?: string): Promise<AuthResponse> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AuthError(409, "Пользователь с таким email уже зарегистрирован");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, displayName: input.displayName ?? null },
  });

  const tokens = await issueSession(user.id, input.unlimitedSession ?? false, userAgent);
  return { user: toAuthUser(user), ...tokens };
}

export async function login(input: LoginInput, userAgent?: string): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash) throw new AuthError(401, "Неверный email или пароль");

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) throw new AuthError(401, "Неверный email или пароль");

  const tokens = await issueSession(user.id, input.unlimitedSession ?? false, userAgent);
  return { user: toAuthUser(user), ...tokens };
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const tokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: { user: true },
  });
  if (!session) throw new AuthError(401, "Сессия недействительна");

  if (session.expiresAt && session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new AuthError(401, "Сессия истекла, войдите заново");
  }

  await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  return { user: toAuthUser(session.user), accessToken: signAccessToken(session.userId), refreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.session.deleteMany({ where: { refreshTokenHash: tokenHash } });
}

/**
 * Находит пользователя по providerId (appleId/googleId); если такого нет, но
 * есть подтверждённый провайдером email — привязывает к существующему аккаунту
 * с этим email; если и такого нет — создаёт нового пользователя.
 */
async function findOrCreateSocialUser(params: {
  provider: "apple" | "google";
  providerId: string;
  email?: string;
  displayName?: string;
}): Promise<User> {
  const { provider, providerId, email, displayName } = params;
  const providerField = provider === "apple" ? ({ appleId: providerId } as const) : ({ googleId: providerId } as const);

  const byProvider = await prisma.user.findUnique({ where: providerField });
  if (byProvider) return byProvider;

  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return prisma.user.update({ where: { id: byEmail.id }, data: providerField });
    }
  }

  const user = await prisma.user.create({
    data: {
      // Соц-пользователь без email от провайдера — не должно случаться на практике
      // (Apple/Google всегда отдают email при первой авторизации), но на всякий
      // случай генерируем плейсхолдер, чтобы не упасть на required-поле.
      email: email ?? `${provider}-${providerId}@social.mypetproj.local`,
      displayName: displayName ?? null,
      ...providerField,
    },
  });
  return user;
}

export async function loginWithApple(input: AppleSignInInput, userAgent?: string): Promise<AuthResponse> {
  const payload = await verifyAppleIdentityToken(input.identityToken);
  const user = await findOrCreateSocialUser({
    provider: "apple",
    providerId: payload.sub,
    email: payload.email,
    displayName: input.displayName,
  });
  const tokens = await issueSession(user.id, input.unlimitedSession ?? false, userAgent);
  return { user: toAuthUser(user), ...tokens };
}

export async function loginWithGoogle(input: GoogleSignInInput, userAgent?: string): Promise<AuthResponse> {
  const payload = await verifyGoogleIdToken(input.idToken);
  const user = await findOrCreateSocialUser({
    provider: "google",
    providerId: payload.sub,
    email: payload.email,
    displayName: payload.name,
  });
  const tokens = await issueSession(user.id, input.unlimitedSession ?? false, userAgent);
  return { user: toAuthUser(user), ...tokens };
}
