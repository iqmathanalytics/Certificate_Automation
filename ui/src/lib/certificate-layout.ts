export type TextAlign = "left" | "center" | "right" | "justify";
export type VerticalAlign = "top" | "center" | "bottom";
export type BoxAlignH = "left" | "center" | "right";
export type BoxAlignV = "top" | "center" | "bottom";

export type CertificateElementId = "recipient" | "body" | "credential" | "issuedDate";

export type CertificateElementStyle = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  color: string;
  lineHeight: number;
};

export type CertificateLayoutConfig = Record<CertificateElementId, CertificateElementStyle>;

export const ELEMENT_LABELS: Record<CertificateElementId, string> = {
  recipient: "Recipient Name",
  body: "Description",
  credential: "Certificate Number",
  issuedDate: "Issue Date",
};


export const DEFAULT_CERTIFICATE_LAYOUT: CertificateLayoutConfig = {
  recipient: {
    x: 30,
    y: 38,
    width: 64.5,
    height: 18,
    fontFamily: "'Great Vibes', 'Segoe Script', cursive",
    fontSize: 58,
    fontWeight: 400,
    fontStyle: "normal",
    textAlign: "center",
    verticalAlign: "center",
    color: "#C9A227",
    lineHeight: 1.15,
  },
  body: {
    x: 30,
    y: 52,
    width: 64.5,
    height: 20,
    fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
    fontSize: 13.5,
    fontWeight: 400,
    fontStyle: "normal",
    textAlign: "center",
    verticalAlign: "top",
    color: "#252525",
    lineHeight: 1.65,
  },
  credential: {
    x: 30,
    y: 76,
    width: 40,
    height: 6,
    fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    fontStyle: "normal",
    textAlign: "left",
    verticalAlign: "center",
    color: "#252525",
    lineHeight: 1.4,
  },
  issuedDate: {
    x: 54.5,
    y: 76,
    width: 40,
    height: 6,
    fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    fontStyle: "normal",
    textAlign: "right",
    verticalAlign: "center",
    color: "#252525",
    lineHeight: 1.4,
  },
};

function mergeElement(
  id: CertificateElementId,
  partial?: Partial<CertificateElementStyle>,
): CertificateElementStyle {
  const base = DEFAULT_CERTIFICATE_LAYOUT[id];
  if (!partial) return { ...base };
  return {
    x: partial.x ?? base.x,
    y: partial.y ?? base.y,
    width: partial.width ?? base.width,
    height: partial.height ?? base.height,
    fontFamily: partial.fontFamily ?? base.fontFamily,
    fontSize: partial.fontSize ?? base.fontSize,
    fontWeight: partial.fontWeight ?? base.fontWeight,
    fontStyle: partial.fontStyle ?? base.fontStyle,
    textAlign: partial.textAlign ?? base.textAlign,
    verticalAlign: partial.verticalAlign ?? base.verticalAlign,
    color: partial.color ?? base.color,
    lineHeight: partial.lineHeight ?? base.lineHeight,
  };
}

export function parseLayoutConfig(layoutJson?: string | null): CertificateLayoutConfig {
  if (!layoutJson) return { ...DEFAULT_CERTIFICATE_LAYOUT };

  try {
    const raw = JSON.parse(layoutJson) as Record<string, Partial<CertificateElementStyle>>;
    return {
      recipient: mergeElement("recipient", raw.recipient),
      body: mergeElement("body", raw.body),
      credential: mergeElement("credential", raw.credential),
      issuedDate: mergeElement("issuedDate", raw.issuedDate),
    };
  } catch {
    return { ...DEFAULT_CERTIFICATE_LAYOUT };
  }
}

export function serializeLayoutConfig(config: CertificateLayoutConfig): string {
  return JSON.stringify(config);
}

export function verticalAlignToFlex(v: VerticalAlign): string {
  if (v === "center") return "center";
  if (v === "bottom") return "flex-end";
  return "flex-start";
}

/** Margins used when snapping a text box to the certificate edges. */
export const BOX_ALIGN_MARGIN = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function horizontalAlignX(width: number, align: BoxAlignH): number {
  const innerLeft = BOX_ALIGN_MARGIN;
  const innerRight = 100 - BOX_ALIGN_MARGIN;
  const innerWidth = innerRight - innerLeft;

  if (align === "left") return innerLeft;
  if (align === "center") return innerLeft + (innerWidth - width) / 2;
  return innerRight - width;
}

function verticalAlignY(height: number, align: BoxAlignV): number {
  const innerTop = BOX_ALIGN_MARGIN;
  const innerBottom = 100 - BOX_ALIGN_MARGIN;
  const innerHeight = innerBottom - innerTop;

  if (align === "top") return innerTop;
  if (align === "center") return innerTop + (innerHeight - height) / 2;
  return innerBottom - height;
}

export function alignBoxHorizontal(style: CertificateElementStyle, align: BoxAlignH): CertificateElementStyle {
  const x = horizontalAlignX(style.width, align);
  return { ...style, x: clamp(x, 0, 100 - style.width) };
}

export function alignBoxVertical(style: CertificateElementStyle, align: BoxAlignV): CertificateElementStyle {
  const y = verticalAlignY(style.height, align);
  return { ...style, y: clamp(y, 0, 100 - style.height) };
}

const ALIGN_TOLERANCE = 1;

export function detectBoxAlignH(style: CertificateElementStyle): BoxAlignH | null {
  const positions: BoxAlignH[] = ["left", "center", "right"];
  for (const align of positions) {
    const x = clamp(horizontalAlignX(style.width, align), 0, 100 - style.width);
    if (Math.abs(style.x - x) <= ALIGN_TOLERANCE) return align;
  }
  return null;
}

export function detectBoxAlignV(style: CertificateElementStyle): BoxAlignV | null {
  const positions: BoxAlignV[] = ["top", "center", "bottom"];
  for (const align of positions) {
    const y = clamp(verticalAlignY(style.height, align), 0, 100 - style.height);
    if (Math.abs(style.y - y) <= ALIGN_TOLERANCE) return align;
  }
  return null;
}
