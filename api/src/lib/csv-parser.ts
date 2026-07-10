export type CsvStudentRow = {
  name: string;
  email: string;
  rowNumber: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const c of candidates) {
    const idx = normalized.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Parse CSV text with Name and Email columns (flexible header names). */
export function parseStudentsCsv(text: string): { rows: CsvStudentRow[]; errors: string[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must include a header row and at least one student row."] };
  }

  const headers = parseCsvLine(lines[0]);
  const nameIdx = findColumn(headers, ["name", "studentname", "fullname", "recipientname"]);
  const emailIdx = findColumn(headers, ["email", "emailaddress", "mail"]);

  const errors: string[] = [];
  if (nameIdx < 0) errors.push('CSV must include a "Name" column.');
  if (emailIdx < 0) errors.push('CSV must include an "Email" column.');
  if (errors.length) return { rows: [], errors };

  const rows: CsvStudentRow[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = (cols[nameIdx] ?? "").trim();
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    const rowNumber = i + 1;

    if (!name && !email) continue;

    if (!name) {
      errors.push(`Row ${rowNumber}: Name is required.`);
      continue;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push(`Row ${rowNumber}: Valid email is required.`);
      continue;
    }
    if (seenEmails.has(email)) {
      errors.push(`Row ${rowNumber}: Duplicate email "${email}".`);
      continue;
    }
    seenEmails.add(email);
    rows.push({ name, email, rowNumber });
  }

  if (!rows.length && !errors.length) {
    errors.push("No valid student rows found in CSV.");
  }

  return { rows, errors };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
