import nodemailer from "nodemailer";
import fs from "fs";
import { env, verifyUrl } from "../lib/env.js";

function smtpConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.fromEmail);
}

function resendConfigured(): boolean {
  return Boolean(env.resendApiKey && env.smtp.fromEmail);
}

function transporter() {
  if (!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

/** True if Resend API key or SMTP credentials are set. */
export function emailConfigured(): boolean {
  return resendConfigured() || smtpConfigured();
}

export function emailProvider(): "resend" | "smtp" | "none" {
  if (resendConfigured()) return "resend";
  if (smtpConfigured()) return "smtp";
  return "none";
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

function fromHeader(): string {
  return `${env.smtp.fromName} <${env.smtp.fromEmail}>`;
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

function buildEmailText(input: CertificateEmailInput): string {
  const verify = verifyUrl(input.credentialId);
  return `Dear ${input.recipientName},\n\nCongratulations! Your certificate (${input.credentialId}) is attached.\n\nVerify online: ${verify}\n\nIQmath Technologies\nwww.iqmath.in`;
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<void> {
  const body: Record<string, unknown> = {
    from: fromHeader(),
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  };

  if (opts.attachments?.length) {
    body.attachments = opts.attachments.map((a) => ({
      filename: a.filename,
      content: a.content.toString("base64"),
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    let detail = errBody;
    try {
      const parsed = JSON.parse(errBody) as { message?: string };
      if (parsed.message) detail = parsed.message;
    } catch {
      /* keep raw */
    }
    throw new Error(`Resend failed (${res.status}): ${detail || res.statusText}`);
  }
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}): Promise<void> {
  const transport = transporter();
  if (!transport) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL");
  }

  await transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
}

export async function sendCertificateEmail(input: CertificateEmailInput): Promise<void> {
  if (!emailConfigured()) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY (recommended on Render) or SMTP_* in .env",
    );
  }
  if (!fs.existsSync(input.pdfPath)) {
    throw new Error(`PDF not found: ${input.pdfPath}`);
  }

  const pdf = fs.readFileSync(input.pdfPath);
  const subject = `Your Certificate from IQmath Technologies — ${input.credentialId}`;
  const html = buildEmailHtml(input);
  const text = buildEmailText(input);
  const attachments = [
    { filename: `${input.credentialId}.pdf`, content: pdf, contentType: "application/pdf" },
  ];

  if (resendConfigured()) {
    await sendViaResend({ to: input.to, subject, html, text, attachments });
    return;
  }

  await sendViaSmtp({ to: input.to, subject, html, text, attachments });
}

export async function sendTestEmail(to: string): Promise<void> {
  if (!emailConfigured()) {
    throw new Error("Email is not configured");
  }

  const provider = emailProvider();
  const subject = "IQmath Certificate Automation — Email Test";
  const html = `<p>Email is configured correctly for <strong>IQmath Technologies</strong> certificate automation.</p><p>Provider: <strong>${provider}</strong></p><p>From: ${escapeHtml(env.smtp.fromEmail)}</p>`;
  const text = `Email is configured correctly for IQmath Technologies (${provider}). From: ${env.smtp.fromEmail}`;

  if (resendConfigured()) {
    await sendViaResend({ to, subject, html, text });
    return;
  }

  await sendViaSmtp({ to, subject, html, text });
}
