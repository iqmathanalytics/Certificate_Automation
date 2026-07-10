import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchHeadlessBrowser } from "../lib/puppeteer-launch.js";
import { buildCertificateHtml } from "./certificate-html.js";
import { resolveTemplateImagePath } from "../lib/template-assets.js";
import { getDefaultTemplateId } from "../lib/seed-templates.js";

export type CertificatePdfInput = {
  templateId?: string | null;
  recipientName: string;
  credentialId: string;
  issuedOn: Date;
  bodyText: string;
};

async function generateViaPuppeteer(html: string): Promise<Buffer> {
  const browser = await launchHeadlessBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 842, height: 595, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load", timeout: 45_000 });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      width: "842px",
      height: "595px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const templateId = input.templateId ?? (await getDefaultTemplateId());
  if (!resolveTemplateImagePath(templateId)) {
    throw new Error("Certificate template image not found. Upload a template first.");
  }

  const html = await buildCertificateHtml({ ...input, templateId });
  return generateViaPuppeteer(html);
}

export function certificateTemplateConfigured(templateId?: string | null): boolean {
  return Boolean(resolveTemplateImagePath(templateId));
}
