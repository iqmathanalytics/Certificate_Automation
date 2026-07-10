import { prisma } from "./prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureTemplateDirs, templateImagePath } from "./template-assets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyTemplate = path.join(__dirname, "../../assets/certificate-template.png");

const DEFAULT_BODY =
  "This is to certify that the above-named participant has successfully completed the training program conducted by IQmath Technologies, demonstrating dedication and proficiency in the subject matter.";

/** Ensure at least one default template exists; migrate legacy CertificateConfig if needed. */
export async function seedDefaultTemplate(): Promise<string> {
  ensureTemplateDirs();

  const existing = await prisma.certificateTemplate.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    const defaultTpl = await prisma.certificateTemplate.findFirst({ where: { isDefault: true } });
    if (!defaultTpl) {
      await prisma.certificateTemplate.update({
        where: { id: existing.id },
        data: { isDefault: true },
      });
    }
    return (defaultTpl ?? existing).id;
  }

  const legacyConfig = await prisma.certificateConfig.findUnique({ where: { id: "default" } });

  const template = await prisma.certificateTemplate.create({
    data: {
      name: "Default Template",
      isDefault: true,
      bodyTemplate: legacyConfig?.bodyTemplate ?? DEFAULT_BODY,
      layoutJson: legacyConfig?.layoutJson ?? null,
      recipientNameFont: legacyConfig?.recipientNameFont ?? "'Great Vibes', 'Segoe Script', cursive",
      bodyFont: legacyConfig?.bodyFont ?? "'Montserrat', Helvetica, Arial, sans-serif",
      recipientNameAlign: legacyConfig?.recipientNameAlign ?? "center",
      bodyAlign: legacyConfig?.bodyAlign ?? "center",
    },
  });

  if (fs.existsSync(legacyTemplate)) {
    fs.copyFileSync(legacyTemplate, templateImagePath(template.id));
  }

  return template.id;
}

export async function getDefaultTemplateId(): Promise<string> {
  const t = await prisma.certificateTemplate.findFirst({ where: { isDefault: true } });
  if (t) return t.id;
  return seedDefaultTemplate();
}
