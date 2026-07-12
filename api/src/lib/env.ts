import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientUrls: process.env.CLIENT_URLS
    ? process.env.CLIENT_URLS.split(",").map((s) => s.trim())
    : ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080", "http://localhost:5174"],
  publicSiteUrl: (process.env.PUBLIC_SITE_URL ?? "https://www.iqmath.in").replace(/\/$/, ""),
  authSecret: process.env.AUTH_SECRET ?? "dev-change-me-in-production",
  adminEmail: process.env.ADMIN_EMAIL ?? "contact@iqmath.in",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    fromName: process.env.SMTP_FROM_NAME ?? "IQmath Technologies",
    fromEmail: process.env.SMTP_FROM_EMAIL ?? "certificates@iqmath.in",
  },
};

export function verifyUrl(credentialId: string): string {
  return `${env.publicSiteUrl}/certificates/${credentialId}`;
}
