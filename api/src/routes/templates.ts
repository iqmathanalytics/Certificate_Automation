import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { generateCertificatePdf } from "../services/pdf-certificate.js";
import { publicTemplateImageUrl, resolveTemplateImagePath, writeTemplateImage } from "../lib/template-assets.js";
import { getDefaultTemplateId } from "../lib/seed-templates.js";

const router = Router();

const TEMPLATE_DEFAULTS = {
  bodyTemplate:
    "This is to certify that the above-named participant has successfully completed the training program conducted by IQmath Technologies, demonstrating dedication and proficiency in the subject matter.",
  recipientNameFont: "'Great Vibes', 'Segoe Script', cursive",
  bodyFont: "'Montserrat', Helvetica, Arial, sans-serif",
  recipientNameAlign: "center",
  bodyAlign: "center",
};

router.get("/templates", async (_req, res) => {
  try {
    const templates = await prisma.certificateTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        isDefault: true,
        bodyTemplate: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    res.json({ templates });
  } catch (err) {
    console.error("GET /templates error:", err);
    res.status(500).json({ error: "Failed to list templates" });
  }
});

router.get("/templates/:id", async (req, res) => {
  try {
    const template = await prisma.certificateTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json({
      template,
      hasImage: Boolean(resolveTemplateImagePath(template.id)),
      imageUrl: publicTemplateImageUrl(template.id, ""),
    });
  } catch (err) {
    console.error("GET /templates/:id error:", err);
    res.status(500).json({ error: "Failed to load template" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(120),
      copyFromId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    let source = null;
    if (parsed.data.copyFromId) {
      source = await prisma.certificateTemplate.findUnique({ where: { id: parsed.data.copyFromId } });
    }
    if (!source) {
      source = await prisma.certificateTemplate.findFirst({ where: { isDefault: true } });
    }

    const template = await prisma.certificateTemplate.create({
      data: {
        name: parsed.data.name,
        isDefault: false,
        bodyTemplate: source?.bodyTemplate ?? TEMPLATE_DEFAULTS.bodyTemplate,
        layoutJson: source?.layoutJson ?? null,
        recipientNameFont: source?.recipientNameFont ?? TEMPLATE_DEFAULTS.recipientNameFont,
        bodyFont: source?.bodyFont ?? TEMPLATE_DEFAULTS.bodyFont,
        recipientNameAlign: source?.recipientNameAlign ?? TEMPLATE_DEFAULTS.recipientNameAlign,
        bodyAlign: source?.bodyAlign ?? TEMPLATE_DEFAULTS.bodyAlign,
      },
    });

    if (source) {
      const srcPath = resolveTemplateImagePath(source.id);
      if (srcPath) {
        writeTemplateImage(template.id, fs.readFileSync(srcPath));
      }
    }

    res.status(201).json({ template });
  } catch (err) {
    console.error("POST /templates error:", err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.put("/templates/:id", async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(120).optional(),
      bodyTemplate: z.string().max(2000).nullable().optional(),
      layoutJson: z.string().max(12000).nullable().optional(),
      recipientNameFont: z.string().min(1).max(120).optional(),
      bodyFont: z.string().min(1).max(120).optional(),
      recipientNameAlign: z.enum(["left", "center", "right"]).optional(),
      bodyAlign: z.enum(["left", "center", "right"]).optional(),
      isDefault: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const exists = await prisma.certificateTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!exists) return res.status(404).json({ error: "Template not found" });

    if (parsed.data.isDefault) {
      await prisma.certificateTemplate.updateMany({ data: { isDefault: false } });
    }

    const template = await prisma.certificateTemplate.update({
      where: { id: req.params.id as string },
      data: parsed.data,
    });
    res.json({ template });
  } catch (err) {
    console.error("PUT /templates/:id error:", err);
    res.status(500).json({ error: "Failed to save template" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const template = await prisma.certificateTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!template) return res.status(404).json({ error: "Template not found" });
    if (template.isDefault) {
      return res.status(400).json({ error: "Cannot delete the default template" });
    }
    const batchCount = await prisma.certificateBatch.count({ where: { templateId: template.id } });
    if (batchCount > 0) {
      return res.status(400).json({ error: "Template is used by existing batches and cannot be deleted" });
    }
    await prisma.certificateTemplate.delete({ where: { id: template.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /templates/:id error:", err);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

router.post("/templates/:id/image", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const template = await prisma.certificateTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!template) return res.status(404).json({ error: "Template not found" });
    writeTemplateImage(template.id, req.file.buffer);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /templates/:id/image error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

router.get("/templates/:id/image", async (req, res) => {
  try {
    const imagePath = resolveTemplateImagePath(req.params.id as string);
    if (!imagePath) return res.status(404).json({ error: "Template image not found" });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.send(fs.readFileSync(imagePath));
  } catch (err) {
    console.error("GET /templates/:id/image error:", err);
    res.status(500).json({ error: "Failed to load image" });
  }
});

router.post("/templates/:id/preview-pdf", async (req, res) => {
  try {
    const schema = z.object({
      recipientName: z.string().min(1).max(120),
      credentialId: z.string().min(1).max(80).optional(),
      issuedOn: z.string(),
      bodyText: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const template = await prisma.certificateTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!template) return res.status(404).json({ error: "Template not found" });

    const pdf = await generateCertificatePdf({
      templateId: template.id,
      recipientName: parsed.data.recipientName,
      credentialId: parsed.data.credentialId ?? "IQ-FSD-82732",
      issuedOn: new Date(parsed.data.issuedOn),
      bodyText: parsed.data.bodyText ?? template.bodyTemplate ?? TEMPLATE_DEFAULTS.bodyTemplate,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="certificate-preview.pdf"');
    res.send(pdf);
  } catch (err) {
    console.error("POST /templates/:id/preview-pdf error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate PDF" });
  }
});

export default router;
