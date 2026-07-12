import { Router } from "express";
import { z } from "zod";
import { createAuthToken, validateAdminCredentials } from "../lib/auth-token.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.post("/auth/login", (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!validateAdminCredentials(parsed.data.email, parsed.data.password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = createAuthToken(parsed.data.email.trim().toLowerCase());
  res.json({
    token,
    email: parsed.data.email.trim().toLowerCase(),
  });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ email: req.adminEmail });
});

export default router;
