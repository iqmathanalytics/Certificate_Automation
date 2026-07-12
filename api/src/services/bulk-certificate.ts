import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../lib/prisma.js";
import { generateCertificatePdfWithBrowser } from "./pdf-certificate.js";
import { launchHeadlessBrowser } from "../lib/puppeteer-launch.js";
import { sendCertificateEmail, emailConfigured } from "./email.js";
import { getDefaultTemplateId } from "../lib/seed-templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.join(__dirname, "../../generated");

function ensureGeneratedDir() {
  if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });
}

export async function processBatch(batchId: string, sendEmails: boolean): Promise<void> {
  const batch = await prisma.certificateBatch.findUnique({
    where: { id: batchId },
    include: { certificates: { orderBy: { createdAt: "asc" } } },
  });

  if (!batch) throw new Error("Batch not found");
  if (batch.status === "PROCESSING") return;

  const templateId = batch.templateId ?? (await getDefaultTemplateId());
  const template = await prisma.certificateTemplate.findUnique({ where: { id: templateId } });
  const description = batch.description ?? template?.bodyTemplate ?? "";

  await prisma.certificateBatch.update({
    where: { id: batchId },
    data: { status: "PROCESSING", generated: 0, emailed: 0, failed: 0 },
  });

  ensureGeneratedDir();

  let generated = 0;
  let emailed = 0;
  let failed = 0;

  const browser = await launchHeadlessBrowser();
  try {
    for (const cert of batch.certificates) {
      try {
        const pdf = await generateCertificatePdfWithBrowser(browser, {
          templateId,
          recipientName: cert.recipientName,
          credentialId: cert.credentialId,
          issuedOn: cert.issuedDate,
          bodyText: description,
        });

        const pdfPath = path.join(generatedDir, `${cert.credentialId}.pdf`);
        fs.writeFileSync(pdfPath, pdf);

        await prisma.certificate.update({
          where: { id: cert.id },
          data: { status: "GENERATED", pdfPath },
        });
        generated++;

        if (sendEmails) {
          if (!emailConfigured()) {
            await prisma.certificate.update({
              where: { id: cert.id },
              data: { emailStatus: "SKIPPED", emailError: "Email not configured" },
            });
          } else {
            try {
              await sendCertificateEmail({
                to: cert.email,
                recipientName: cert.recipientName,
                credentialId: cert.credentialId,
                issuedDate: cert.issuedDate,
                pdfPath,
              });
              await prisma.certificate.update({
                where: { id: cert.id },
                data: { emailStatus: "SENT", emailError: null },
              });
              emailed++;
            } catch (emailErr) {
              const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
              await prisma.certificate.update({
                where: { id: cert.id },
                data: { emailStatus: "FAILED", emailError: msg },
              });
              failed++;
            }
          }
        }

        await prisma.certificateBatch.update({
          where: { id: batchId },
          data: { generated, emailed, failed },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.certificate.update({
          where: { id: cert.id },
          data: { status: "FAILED", emailError: msg },
        });
        failed++;
        await prisma.certificateBatch.update({
          where: { id: batchId },
          data: { failed },
        });
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const finalStatus = failed === batch.certificates.length ? "FAILED" : "COMPLETED";
  await prisma.certificateBatch.update({
    where: { id: batchId },
    data: { status: finalStatus, generated, emailed, failed },
  });
}

export async function sendBatchEmails(batchId: string): Promise<void> {
  const batch = await prisma.certificateBatch.findUnique({
    where: { id: batchId },
    include: { certificates: { where: { status: "GENERATED" } } },
  });

  if (!batch) throw new Error("Batch not found");
  if (!emailConfigured()) throw new Error("Email is not configured");

  const templateId = batch.templateId ?? (await getDefaultTemplateId());
  const template = await prisma.certificateTemplate.findUnique({ where: { id: templateId } });
  const description = batch.description ?? template?.bodyTemplate ?? "";

  ensureGeneratedDir();

  let emailed = 0;
  let failed = 0;

  const needsRegen = batch.certificates.some(
    (c) => c.emailStatus !== "SENT" && (!c.pdfPath || !fs.existsSync(c.pdfPath)),
  );

  const browser = needsRegen ? await launchHeadlessBrowser() : null;
  try {
    for (const cert of batch.certificates) {
      if (cert.emailStatus === "SENT") continue;

      try {
        let pdfPath = cert.pdfPath;
        if (!pdfPath || !fs.existsSync(pdfPath)) {
          if (!browser) throw new Error(`PDF not found: ${pdfPath ?? cert.credentialId}`);
          const pdf = await generateCertificatePdfWithBrowser(browser, {
            templateId,
            recipientName: cert.recipientName,
            credentialId: cert.credentialId,
            issuedOn: cert.issuedDate,
            bodyText: description,
          });
          pdfPath = path.join(generatedDir, `${cert.credentialId}.pdf`);
          fs.writeFileSync(pdfPath, pdf);
          await prisma.certificate.update({
            where: { id: cert.id },
            data: { pdfPath },
          });
        }

        await sendCertificateEmail({
          to: cert.email,
          recipientName: cert.recipientName,
          credentialId: cert.credentialId,
          issuedDate: cert.issuedDate,
          pdfPath,
        });
        await prisma.certificate.update({
          where: { id: cert.id },
          data: { emailStatus: "SENT", emailError: null },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.certificate.update({
          where: { id: cert.id },
          data: { emailStatus: "FAILED", emailError: msg },
        });
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }

  const refreshed = await prisma.certificate.findMany({ where: { batchId } });
  emailed = refreshed.filter((c) => c.emailStatus === "SENT").length;
  failed = refreshed.filter((c) => c.emailStatus === "FAILED").length;

  await prisma.certificateBatch.update({
    where: { id: batchId },
    data: { emailed, failed },
  });
}
