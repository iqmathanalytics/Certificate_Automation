import { Router } from "express";
import { z } from "zod";
import { emailConfigured, sendTestEmail } from "../services/email.js";
import { env } from "../lib/env.js";

import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.get("/email/status", requireAuth, (_req, res) => {
  res.json({
    configured: emailConfigured(),
    host: env.smtp.host || null,
    port: env.smtp.port,
    fromEmail: env.smtp.fromEmail || null,
    fromName: env.smtp.fromName,
  });
});

router.post("/email/test", requireAuth, async (req, res) => {
  try {
    const schema = z.object({ to: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Valid email address required" });

    if (!emailConfigured()) {
      return res.status(400).json({
        error: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL to api/.env",
      });
    }

    await sendTestEmail(parsed.data.to);
    res.json({ ok: true, message: `Test email sent to ${parsed.data.to}` });
  } catch (err) {
    console.error("POST /email/test error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to send test email" });
  }
});

export default router;
