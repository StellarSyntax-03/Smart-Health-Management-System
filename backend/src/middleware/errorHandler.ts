import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.message}`);

  res.status(500).json({
    error: "Internal server error",
    ...(env.NODE_ENV === "development" && { message: err.message }),
  });
}
