import { prisma } from "./prisma.js";

/** Normalize user prefix e.g. "iq-fsd" → "IQ-FSD" */
export function normalizePrefix(prefix: string): string {
  return prefix
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Valid format: IQ-FSD, IQ-MATH, etc. */
export function validatePrefix(prefix: string): boolean {
  const n = normalizePrefix(prefix);
  return n.length >= 2 && /^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(n);
}

export function formatCredentialId(prefix: string, number: number): string {
  return `${normalizePrefix(prefix)}-${number}`;
}

/** Peek the next ID without allocating. */
export async function peekNextCredentialId(prefix: string): Promise<string> {
  const normalized = normalizePrefix(prefix);
  if (!validatePrefix(normalized)) {
    throw new Error("Invalid certificate ID prefix. Use format like IQ-FSD");
  }
  const seq = await prisma.certificateIdSequence.findUnique({ where: { prefix: normalized } });
  const next = seq?.nextNumber ?? 1;
  return formatCredentialId(normalized, next);
}

/**
 * Allocate incrementing certificate IDs for a prefix.
 * Format: IQ-FSD-82732, IQ-FSD-82733, ...
 */
export async function allocateCredentialIds(
  prefix: string,
  count: number,
  startingNumber?: number,
): Promise<{ prefix: string; ids: string[] }> {
  const normalized = normalizePrefix(prefix);
  if (!validatePrefix(normalized)) {
    throw new Error("Invalid certificate ID prefix. Use format like IQ-FSD");
  }
  if (count < 1) throw new Error("Count must be at least 1");

  return prisma.$transaction(async (tx) => {
    let seq = await tx.certificateIdSequence.findUnique({ where: { prefix: normalized } });

    if (!seq) {
      const start = startingNumber && startingNumber > 0 ? Math.floor(startingNumber) : 1;
      seq = await tx.certificateIdSequence.create({
        data: { prefix: normalized, nextNumber: start },
      });
    }

    const ids: string[] = [];
    let num = seq.nextNumber;
    for (let i = 0; i < count; i++) {
      ids.push(formatCredentialId(normalized, num));
      num++;
    }

    await tx.certificateIdSequence.update({
      where: { prefix: normalized },
      data: { nextNumber: num },
    });

    return { prefix: normalized, ids };
  });
}
