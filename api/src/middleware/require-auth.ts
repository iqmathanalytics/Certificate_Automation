import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../lib/auth-token.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.adminEmail = payload.email;
  next();
}
