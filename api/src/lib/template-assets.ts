import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "../../assets");
const templatesDir = path.join(assetsDir, "templates");
const legacyTemplate = path.join(assetsDir, "certificate-template.png");
const uiPublicDir = path.join(__dirname, "../../../ui/public");

export function ensureTemplateDirs() {
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
}

export function templateImagePath(templateId: string): string {
  return path.join(templatesDir, `${templateId}.png`);
}

export function templateImageExists(templateId: string): boolean {
  const p = templateImagePath(templateId);
  if (fs.existsSync(p)) return true;
  return fs.existsSync(legacyTemplate);
}

export function resolveTemplateImagePath(templateId?: string | null): string | null {
  if (templateId) {
    const p = templateImagePath(templateId);
    if (fs.existsSync(p)) return p;
  }
  return fs.existsSync(legacyTemplate) ? legacyTemplate : null;
}

export function writeTemplateImage(templateId: string, buffer: Buffer) {
  ensureTemplateDirs();
  const dest = templateImagePath(templateId);
  fs.writeFileSync(dest, buffer);
  if (templateId === "default" || !fs.existsSync(legacyTemplate)) {
    fs.writeFileSync(legacyTemplate, buffer);
  }
  if (fs.existsSync(uiPublicDir)) {
    fs.writeFileSync(path.join(uiPublicDir, `certificate-template-${templateId}.png`), buffer);
    fs.writeFileSync(path.join(uiPublicDir, "certificate-template.png"), buffer);
  }
}

export function publicTemplateImageUrl(templateId: string, apiBase: string): string {
  return `${apiBase}/api/templates/${templateId}/image`;
}
