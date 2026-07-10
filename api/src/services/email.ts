import nodemailer from "nodemailer";
import fs from "fs";
import { env, verifyUrl } from "../lib/env.js";

function transporter() {
  if (!env.smtp.host || !env.smtp.user) {
    return null;
  }
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

export function emailConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.fromEmail);
}

export type CertificateEmailInput = {
  to: string;
  recipientName: string;
  credentialId: string;
  issuedDate: Date;
  pdfPath: string;
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildEmailHtml(input: CertificateEmailInput): string {
  const verify = verifyUrl(input.credentialId);
  const issued = input.issuedDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#2563eb 100%);padding:28px 32px;">
            <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#93c5fd;">IQmath Technologies</p>
            <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;color:#ffffff;">Your Certificate</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Dear <strong>${escapeHtml(input.recipientName)}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">
              Congratulations! Please find your certificate attached to this email.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin:24px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Certificate Number</p>
                <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(input.credentialId)}</p>
                <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Issued Date</p>
                <p style="margin:0;font-size:15px;color:#334155;">${escapeHtml(issued)}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#334155;">
              You can verify your certificate online at any time using the link below:
            </p>
            <p style="margin:0 0 24px;">
              <a href="${verify}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Verify Certificate</a>
            </p>
            <p style="margin:0;font-size:13px;color:#64748b;word-break:break-all;">${escapeHtml(verify)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              IQmath Technologies · <a href="https://www.iqmath.in" style="color:#2563eb;text-decoration:none;">www.iqmath.in</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendCertificateEmail(input: CertificateEmailInput): Promise<void> {
  const transport = transporter();
  if (!transport) {
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL in .env");
  }
  if (!fs.existsSync(input.pdfPath)) {
    throw new Error(`PDF not found: ${input.pdfPath}`);
  }

  const verify = verifyUrl(input.credentialId);

  await transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to: input.to,
    subject: `Your Certificate from IQmath Technologies — ${input.credentialId}`,
    html: buildEmailHtml(input),
    text: `Dear ${input.recipientName},\n\nCongratulations! Your certificate (${input.credentialId}) is attached.\n\nVerify online: ${verify}\n\nIQmath Technologies\nwww.iqmath.in`,
    attachments: [
      {
        filename: `${input.credentialId}.pdf`,
        content: fs.readFileSync(input.pdfPath),
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendTestEmail(to: string): Promise<void> {
  const transport = transporter();
  if (!transport) {
    throw new Error("Email is not configured");
  }

  await transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to,
    subject: "IQmath Certificate Automation — SMTP Test",
    html: `<p>SMTP is configured correctly for <strong>IQmath Technologies</strong> certificate automation.</p><p>From: ${escapeHtml(env.smtp.fromEmail)}</p>`,
    text: "SMTP is configured correctly for IQmath Technologies certificate automation.",
  });
}
