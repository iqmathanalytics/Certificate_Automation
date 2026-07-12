/** Lightweight **bold** markers in certificate body text (no free HTML). */

export type RichSegment = { text: string; bold?: boolean };

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Parse `**bold**` segments from plain body text. */
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
  return parseBoldMarkdown(src)
    .map((seg) => {
      const escaped = escapeHtml(seg.text).replace(/\n/g, "<br>");
      return seg.bold ? `<strong>${escaped}</strong>` : escaped;
    })
    .join("");
}

export function serializeBoldMarkdown(segments: RichSegment[]): string {
  return segments
    .map((seg) => {
      if (!seg.text) return "";
      if (seg.bold) return `**${seg.text.replace(/\*\*/g, "")}**`;
      return seg.text;
    })
    .join("");
}

/** Toggle **bold** around the current textarea selection. */
export function toggleBoldInSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  if (start === end) {
    // Insert bold markers at caret
    const next = value.slice(0, start) + "****" + value.slice(end);
    return { value: next, selectionStart: start + 2, selectionEnd: start + 2 };
  }

  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  // Unwrap if already wrapped
  if (selected.startsWith("**") && selected.endsWith("**") && selected.length >= 4) {
    const inner = selected.slice(2, -2);
    const next = before + inner + after;
    return { value: next, selectionStart: start, selectionEnd: start + inner.length };
  }
  if (before.endsWith("**") && after.startsWith("**")) {
    const next = before.slice(0, -2) + selected + after.slice(2);
    return { value: next, selectionStart: start - 2, selectionEnd: end - 2 };
  }

  const wrapped = `**${selected}**`;
  const next = before + wrapped + after;
  return { value: next, selectionStart: start, selectionEnd: start + wrapped.length };
}

/** Convert a contentEditable-ish HTML subset back to **markdown**. */
export function htmlFragmentToBoldMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild as HTMLElement | null;
  if (!root) return "";

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") return "\n";
    const inner = Array.from(el.childNodes).map(walk).join("");
    if (tag === "strong" || tag === "b") {
      if (!inner) return "";
      return `**${inner.replace(/\*\*/g, "")}**`;
    }
    if (tag === "div" || tag === "p") {
      return inner + (el.nextSibling ? "\n" : "");
    }
    return inner;
  };

  return Array.from(root.childNodes).map(walk).join("").replace(/\n+$/, "");
}
