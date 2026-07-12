import crypto from "crypto";
import { env } from "./env.js";

type TokenPayload = {
  email: string;
  exp: number;
};

export function createAuthToken(email: string): string {
  const payload: TokenPayload = {
    email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", env.authSecret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyAuthToken(token: string): TokenPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expected = crypto.createHmac("sha256", env.authSecret).update(data).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as TokenPayload;
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function validateAdminCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === env.adminEmail.toLowerCase() && password === env.adminPassword;
}
