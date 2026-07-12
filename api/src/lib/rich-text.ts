/** Lightweight **bold** markers in certificate body text (no free HTML). */

export type RichSegment = { text: string; bold?: boolean };

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseBoldMarkdown(src: string): RichSegment[] {
  const segments: RichSegment[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) segments.push({ text: src.slice(last, m.index) });
    segments.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) segments.push({ text: src.slice(last) });
  if (segments.length === 0 && src.length === 0) return [];
  if (segments.length === 0) return [{ text: src }];
  return segments;
}

/** Escape text and wrap bold segments in <strong>; newlines → <br>. */
export function boldMarkdownToHtml(src: string): string {
  return parseBoldMarkdown(dedupeRepeatedBody(src))
    .map((seg) => {
      const escaped = escapeHtml(seg.text).replace(/\n/g, "<br>");
      return seg.bold ? `<strong>${escaped}</strong>` : escaped;
    })
    .join("");
}

/**
 * If the body was accidentally saved as exact back-to-back duplicates
 * (contentEditable/React bug), collapse to a single copy.
 */
export function dedupeRepeatedBody(src: string): string {
  const text = src.trim();
  if (text.length < 40) return src;

  const mid = Math.floor(text.length / 2);
  for (let i = mid - 5; i <= mid + 5; i++) {
    if (i < 20 || i > text.length - 20) continue;
    const a = text.slice(0, i).trim();
    const b = text.slice(i).trim();
    if (a.length >= 20 && a === b) return a;
  }
  return src;
}

