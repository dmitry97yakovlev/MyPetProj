import { z } from "zod";

export const RegisterInputSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
  displayName: z.string().min(1).max(60).optional(),
  unlimitedSession: z.boolean().optional().default(false),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
  unlimitedSession: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const AppleSignInInputSchema = z.object({
  identityToken: z.string().min(1),
  displayName: z.string().min(1).max(60).optional(),
  unlimitedSession: z.boolean().optional().default(false),
});
export type AppleSignInInput = z.infer<typeof AppleSignInInputSchema>;

export const GoogleSignInInputSchema = z.object({
  idToken: z.string().min(1),
  unlimitedSession: z.boolean().optional().default(false),
});
export type GoogleSignInInput = z.infer<typeof GoogleSignInInputSchema>;

/** Пользователь в том виде, в каком его видит клиент — без passwordHash и т.п. */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  /** Короткоживущий токен (JWT) для авторизации запросов, ~15 минут. */
  accessToken: string;
  /**
   * Токен для обновления accessToken. Если при входе/регистрации был выбран
   * unlimitedSession — не имеет срока действия, иначе живёт ограниченное время.
   */
  refreshToken: string;
}
