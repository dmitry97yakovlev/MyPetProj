import { AppleSignInInputSchema, GoogleSignInInputSchema, LoginInputSchema, RegisterInputSchema } from "@mypetproj/shared";
import { Router } from "express";
import { AppError } from "../../errors";
import { AuthError, login, loginWithApple, loginWithGoogle, logout, refresh, register } from "./auth.service";

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  const parsed = RegisterInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  try {
    const result = await register(parsed.data, req.headers["user-agent"]);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  const parsed = LoginInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  try {
    const result = await login(parsed.data, req.headers["user-agent"]);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/apple", async (req, res, next) => {
  const parsed = AppleSignInInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  try {
    const result = await loginWithApple(parsed.data, req.headers["user-agent"]);
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/google", async (req, res, next) => {
  const parsed = GoogleSignInInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  try {
    const result = await loginWithGoogle(parsed.data, req.headers["user-agent"]);
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  const refreshToken = req.body?.refreshToken;
  if (typeof refreshToken !== "string" || !refreshToken) {
    res.status(400).json({ error: "refreshToken обязателен" });
    return;
  }
  try {
    const result = await refresh(refreshToken);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  const refreshToken = req.body?.refreshToken;
  try {
    if (typeof refreshToken === "string" && refreshToken) {
      await logout(refreshToken);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
