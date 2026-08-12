import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";

type Handler<Req extends Request> = (req: Req, res: Response, next: NextFunction) => Promise<void>;

/** Оборачивает async-хендлер: ошибки AppError превращает в HTTP-ответ, остальные пробрасывает в error middleware. */
export function asyncHandler<Req extends Request = Request>(handler: Handler<Req>) {
  return (req: Req, res: Response, next: NextFunction) => {
    handler(req, res, next).catch((err: unknown) => {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      next(err);
    });
  };
}
