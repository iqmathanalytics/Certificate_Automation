import fs from "fs";
import { prisma } from "../lib/prisma.js";
import {
  blockCss,
  GOOGLE_FONTS_URL,
  parseLayoutConfig,
  textCss,
} from "../lib/certificate-layout.js";
import { formatRecipientName, formatIssuedDateLong } from "../lib/certificate-copy.js";
import { getDefaultTemplateId } from "../lib/seed-templates.js";
import { resolveTemplateImagePath } from "../lib/template-assets.js";
export type CertificateHtmlInput = {
  templateId?: string | null;
  recipientName: string;
  credentialId: string;
  issuedOn: Date;
  bodyText: string;
};

const CERT_DEFAULTS = {
  bodyTemplate:
    "This is to certify that the above-named participant has successfully completed the training program conducted by IQmath Technologies, demonstrating dedication and proficiency in the subject matter.",
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function templateBackgroundDataUri(templateId: string): string {
  const file = resolveTemplateImagePath(templateId);
  if (!file) return "";
  const b64 = fs.readFileSync(file).toString("base64");
  return `data:image/png;base64,${b64}`;
}

export async function buildCertificateHtml(input: CertificateHtmlInput): Promise<string> {
  const templateId = input.templateId ?? (await getDefaultTemplateId());
  const template = await prisma.certificateTemplate.findUnique({ where: { id: templateId } });
  const legacyConfig = await prisma.certificateConfig.findUnique({ where: { id: "default" } }).catch(() => null);
  const layoutCfg = parseLayoutConfig(template?.layoutJson ?? legacyConfig?.layoutJson);
  const bodyContent = escapeHtml(
    input.bodyText || template?.bodyTemplate || legacyConfig?.bodyTemplate || CERT_DEFAULTS.bodyTemplate,
  );
  const bg = templateBackgroundDataUri(templateId);
  const r = layoutCfg.recipient;
  const b = layoutCfg.body;
  const c = layoutCfg.credential;
  const d = layoutCfg.issuedDate;
  const issuedLabel = formatIssuedDateLong(input.issuedOn);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${GOOGLE_FONTS_URL}" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 842px; height: 595px; overflow: hidden; }
    .cert {
      position: relative;
      width: 842px;
      height: 595px;
      overflow: hidden;
      background: #fff;
    }
    .bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 0;
    }
    .text-block {
      position: absolute;
      z-index: 10;
      overflow: visible;
    }
  </style>
</head>
<body>
  <div class="cert">
    ${bg ? `<img class="bg" src="${bg}" alt="" />` : ""}
    <div class="text-block" style="${blockCss(r)}">
      <p style="${textCss(r)}">${escapeHtml(formatRecipientName(input.recipientName))}</p>
    </div>
    <div class="text-block" style="${blockCss(b)}">
      <p style="${textCss(b)}">${bodyContent}</p>
    </div>
    <div class="text-block" style="${blockCss(c)}">
      <p style="${textCss(c)}">
        <span style="font-weight:700;font-size:${c.fontSize - 1}px">Certificate No:</span>
        <span> ${escapeHtml(input.credentialId)}</span>
      </p>
    </div>
    <div class="text-block" style="${blockCss(d)}">
      <p style="${textCss(d)}">
        <span style="font-weight:700;font-size:${d.fontSize - 1}px">Issued:</span>
        <span> ${escapeHtml(issuedLabel)}</span>
      </p>
    </div>
  </div>
</body>
</html>`;
}
