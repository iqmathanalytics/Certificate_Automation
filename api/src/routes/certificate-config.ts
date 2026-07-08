import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../lib/prisma.js";
import { generateCertificatePdf } from "../services/pdf-certificate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "../../assets");
const uiPublicDir = path.join(__dirname, "../../../ui/public");

const router = Router();

const CERT_CONFIG_DEFAULTS = {
  brandName: "VENTRIX GLOBAL",
  badgeText: "CERTIFIED",
  presentedLabel: "THIS CERTIFICATE IS PRESENTED TO",
  bodyTemplate:
    "In recognition of outstanding achievement in the [ Exam Title ] professional certification examination, with a final score of [ Score ]. Issued on [ Date ].",
  verifyBaseUrl: "www.ventrix.global/certificate/",
  recipientNameFont: "'Great Vibes', 'Segoe Script', cursive",
  bodyFont: "'Montserrat', Helvetica, Arial, sans-serif",
  recipientNameAlign: "center",
  bodyAlign: "left",
  layoutJson: null as string | null,
};

router.get("/certificate-config", async (_req, res) => {
  try {
    const config = await prisma.certificateConfig.findUnique({ where: { id: "default" } });
    res.json({ config: config ?? { id: "default", ...CERT_CONFIG_DEFAULTS } });
  } catch (err) {
    console.error("GET /certificate-config error:", err);
    res.status(500).json({ error: "Failed to load certificate config" });
  }
});

router.put("/certificate-config", async (req, res) => {
  try {
    const schema = z.object({
      brandName: z.string().min(1).max(100),
      badgeText: z.string().min(1).max(100),
      presentedLabel: z.string().min(1).max(200),
      bodyTemplate: z.string().max(1000).nullable().optional(),
      verifyBaseUrl: z.string().min(1).max(200),
      recipientNameFont: z.string().min(1).max(120).optional(),
      bodyFont: z.string().min(1).max(120).optional(),
      recipientNameAlign: z.enum(["left", "center", "right"]).optional(),
      bodyAlign: z.enum(["left", "center", "right"]).optional(),
      layoutJson: z.string().max(5000).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", detail: JSON.stringify(parsed.error.flatten()) });
    }
    const data = {
      ...parsed.data,
      recipientNameFont: parsed.data.recipientNameFont || CERT_CONFIG_DEFAULTS.recipientNameFont,
      bodyFont: parsed.data.bodyFont || CERT_CONFIG_DEFAULTS.bodyFont,
      recipientNameAlign: parsed.data.recipientNameAlign || CERT_CONFIG_DEFAULTS.recipientNameAlign,
      bodyAlign: parsed.data.bodyAlign || CERT_CONFIG_DEFAULTS.bodyAlign,
    };

    const config = await prisma.certificateConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    res.json({ config });
  } catch (err) {
    console.error("PUT /certificate-config error:", err);
    res.status(500).json({ error: "Failed to save certificate config" });
  }
});

const certImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

router.post("/certificate-config/image", certImageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const dest = path.join(assetsDir, "certificate-template.png");
    fs.writeFileSync(dest, req.file.buffer);
    if (fs.existsSync(uiPublicDir)) {
      fs.writeFileSync(path.join(uiPublicDir, "certificate-template.png"), req.file.buffer);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /certificate-config/image error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

router.post("/certificate-config/preview-pdf", async (req, res) => {
  try {
    const schema = z.object({
      recipientName: z.string().min(1).max(120),
      examTitle: z.string().min(1).max(200),
      description: z.string().optional(),
      credentialId: z.string().min(1).max(80),
      issuedOn: z.string(),
      score: z.number().int().min(0).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const pdf = await generateCertificatePdf({
      recipientName: parsed.data.recipientName,
      examTitle: parsed.data.examTitle,
      description: parsed.data.description ?? "",
      credentialId: parsed.data.credentialId,
      issuedOn: new Date(parsed.data.issuedOn),
      score: parsed.data.score,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="certificate-preview.pdf"');
    res.send(pdf);
  } catch (err) {
    console.error("POST /certificate-config/preview-pdf error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate PDF" });
  }
});

export default router;
