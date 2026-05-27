import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { env } from "../config/env.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof Error && err.message.startsWith("Invalid file type")) {
    res.status(400).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  console.error(`[Error] ${message}`);

  res.status(500).json({
    error: "Internal server error",
    ...(env.NODE_ENV === "development" && { message }),
  });
}
