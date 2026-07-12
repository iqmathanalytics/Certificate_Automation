import type { Browser } from "puppeteer-core";
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

/** Generate one PDF using an already-open browser (caller owns browser lifecycle). */
export async function generateCertificatePdfWithBrowser(
  browser: Browser,
  input: CertificatePdfInput,
): Promise<Buffer> {
  const templateId = input.templateId ?? (await getDefaultTemplateId());
  if (!resolveTemplateImagePath(templateId)) {
    throw new Error("Certificate template image not found. Upload a template first.");
  }

  const html = await buildCertificateHtml({ ...input, templateId });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 842, height: 595, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await Promise.race([
      page.evaluateHandle("document.fonts.ready"),
      new Promise((r) => setTimeout(r, 5_000)),
    ]);

    const pdf = await page.pdf({
      width: "842px",
      height: "595px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Single-shot PDF (launches and closes Chromium). Prefer WithBrowser for batches. */
export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const browser = await launchHeadlessBrowser();
  try {
    return await generateCertificatePdfWithBrowser(browser, input);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export function certificateTemplateConfigured(templateId?: string | null): boolean {
  return Boolean(resolveTemplateImagePath(templateId));
}
