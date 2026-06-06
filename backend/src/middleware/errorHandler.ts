import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";
  const details = err instanceof AppError ? err.details : undefined;

  // Log error stack for debugging
  console.error(`[Error] [${req.method}] ${req.url}:`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}
