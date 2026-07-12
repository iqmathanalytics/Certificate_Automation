import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parseStudentsCsv } from "../lib/csv-parser.js";
import { allocateCredentialIds, peekNextCredentialId, validatePrefix } from "../lib/certificate-id.js";
import { processBatch, sendBatchEmails } from "../services/bulk-certificate.js";
import { emailConfigured } from "../services/email.js";
import { verifyUrl } from "../lib/env.js";
import { getDefaultTemplateId } from "../lib/seed-templates.js";
import { templateImageExists } from "../lib/template-assets.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "text/csv" || file.originalname.endsWith(".csv") || file.mimetype === "application/vnd.ms-excel");
  },
});

router.get("/verify/:credentialId", async (req, res) => {
  try {
    const credentialId = (req.params.credentialId as string).trim().toUpperCase();
    const cert = await prisma.certificate.findUnique({
      where: { credentialId },
      include: {
        batch: { select: { title: true, description: true, templateId: true } },
      },
    });

    if (!cert || cert.status !== "GENERATED") {
      return res.status(404).json({ valid: false, error: "Certificate not found" });
    }

    const template = cert.batch.templateId
      ? await prisma.certificateTemplate.findUnique({ where: { id: cert.batch.templateId } })
      : null;

    res.json({
      valid: true,
      certificate: {
        credentialId: cert.credentialId,
        recipientName: cert.recipientName,
        issuedDate: cert.issuedDate,
        description: cert.batch.description ?? template?.bodyTemplate ?? null,
        batchTitle: cert.batch.title,
        brandName: "IQMATH TECHNOLOGIES",
        verifyUrl: verifyUrl(cert.credentialId),
      },
    });
  } catch (err) {
    console.error("GET /verify/:credentialId error:", err);
    res.status(500).json({ valid: false, error: "Verification failed" });
  }
});

router.get("/batches/id-preview", requireAuth, async (req, res) => {
  try {
    const prefix = String(req.query.prefix ?? "");
    if (!prefix || !validatePrefix(prefix)) {
      return res.status(400).json({ error: "Invalid prefix. Use format like IQ-FSD" });
    }
    const nextId = await peekNextCredentialId(prefix);
    res.json({ prefix: prefix.toUpperCase(), nextId });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid prefix" });
  }
});

router.get("/batches", requireAuth, async (_req, res) => {
  try {
    const batches = await prisma.certificateBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        batchCode: true,
        title: true,
        issuedDate: true,
        status: true,
        totalCount: true,
        generated: true,
        emailed: true,
        failed: true,
        idPrefix: true,
        templateId: true,
        createdAt: true,
        template: { select: { name: true } },
      },
    });
    res.json({ batches, emailConfigured: emailConfigured() });
  } catch (err) {
    console.error("GET /batches error:", err);
    res.status(500).json({ error: "Failed to list batches" });
  }
});

router.get("/batches/:id", requireAuth, async (req, res) => {
  try {
    const batch = await prisma.certificateBatch.findUnique({
      where: { id: req.params.id as string },
      include: {
        template: { select: { id: true, name: true } },
        certificates: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            recipientName: true,
            email: true,
            credentialId: true,
            issuedDate: true,
            status: true,
            emailStatus: true,
            emailError: true,
          },
        },
      },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    res.json({ batch, emailConfigured: emailConfigured() });
  } catch (err) {
    console.error("GET /batches/:id error:", err);
    res.status(500).json({ error: "Failed to load batch" });
  }
});

router.post("/batches", requireAuth, csvUpload.single("csv"), async (req, res) => {
  try {
    const metaSchema = z.object({
      issuedDate: z.string(),
      title: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
      sendEmails: z.enum(["true", "false"]).optional(),
      idPrefix: z.string().min(2).max(40),
      startingNumber: z.string().optional(),
      templateId: z.string().optional(),
    });
    const meta = metaSchema.safeParse(req.body);
    if (!meta.success) {
      return res.status(400).json({ error: "Invalid input", detail: meta.error.flatten() });
    }

    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required (field name: csv)" });
    }

    if (!validatePrefix(meta.data.idPrefix)) {
      return res.status(400).json({ error: "Invalid certificate ID prefix. Use format like IQ-FSD" });
    }

    const csvText = req.file.buffer.toString("utf-8");
    const { rows, errors } = parseStudentsCsv(csvText);
    if (errors.length) {
      return res.status(400).json({ error: "CSV validation failed", details: errors });
    }

    const issuedDate = new Date(meta.data.issuedDate);
    if (Number.isNaN(issuedDate.getTime())) {
      return res.status(400).json({ error: "Invalid issued date" });
    }

    const templateId = meta.data.templateId ?? (await getDefaultTemplateId());
    const template = await prisma.certificateTemplate.findUnique({ where: { id: templateId } });
    if (!template) return res.status(400).json({ error: "Template not found" });
    if (!templateImageExists(templateId)) {
      return res.status(400).json({ error: "Selected template has no background image. Upload one in Template Editor." });
    }

    const description = meta.data.description ?? template.bodyTemplate ?? "";
    const startingNumber = meta.data.startingNumber ? Number(meta.data.startingNumber) : undefined;
    if (startingNumber !== undefined && (!Number.isInteger(startingNumber) || startingNumber < 1)) {
      return res.status(400).json({ error: "Starting number must be a positive integer" });
    }

    const { prefix, ids } = await allocateCredentialIds(meta.data.idPrefix, rows.length, startingNumber);

    const batch = await prisma.certificateBatch.create({
      data: {
        batchCode: `${prefix}-${ids[0]}`,
        idPrefix: prefix,
        templateId,
        title: meta.data.title ?? `${template.name} — ${prefix}`,
        issuedDate,
        description,
        totalCount: rows.length,
        certificates: {
          create: rows.map((row, i) => ({
            recipientName: row.name,
            email: row.email,
            credentialId: ids[i],
            issuedDate,
          })),
        },
      },
      include: { certificates: true },
    });

    const shouldSend = meta.data.sendEmails === "true";

    processBatch(batch.id, shouldSend).catch((err) => {
      console.error(`Batch ${batch.id} processing failed:`, err);
    });

    res.status(201).json({
      batch: {
        id: batch.id,
        batchCode: batch.batchCode,
        title: batch.title,
        issuedDate: batch.issuedDate,
        status: batch.status,
        totalCount: batch.totalCount,
        idPrefix: batch.idPrefix,
        templateId: batch.templateId,
      },
      message: shouldSend
        ? "Batch created. Certificates are being generated and emailed."
        : "Batch created. Certificates are being generated.",
    });
  } catch (err) {
    console.error("POST /batches error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to create batch" });
  }
});

router.post("/batches/:id/send-emails", requireAuth, async (req, res) => {
  try {
    if (!emailConfigured()) {
      return res.status(400).json({
        error: "Email is not configured. Set RESEND_API_KEY (Render) or SMTP_* in .env",
      });
    }
    const batch = await prisma.certificateBatch.findUnique({ where: { id: req.params.id as string } });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    sendBatchEmails(batch.id).catch((err) => {
      console.error(`Batch ${batch.id} email send failed:`, err);
    });

    res.json({ ok: true, message: "Emails are being sent." });
  } catch (err) {
    console.error("POST /batches/:id/send-emails error:", err);
    res.status(500).json({ error: "Failed to send emails" });
  }
});

export default router;
