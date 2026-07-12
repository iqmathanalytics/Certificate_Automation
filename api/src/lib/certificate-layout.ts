export type TextAlign = "left" | "center" | "right" | "justify";
export type VerticalAlign = "top" | "center" | "bottom";

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

export function verticalAlignToFlex(v: VerticalAlign): string {
  if (v === "center") return "center";
  if (v === "bottom") return "flex-end";
  return "flex-start";
}

export function blockCss(style: CertificateElementStyle): string {
  const justify = verticalAlignToFlex(style.verticalAlign);
  return [
    `left:${style.x}%`,
    `top:${style.y}%`,
    `width:${style.width}%`,
    `height:${style.height}%`,
    `display:flex`,
    `flex-direction:column`,
    `justify-content:${justify}`,
  ].join(";");
}

export function textCss(style: CertificateElementStyle): string {
  const justifyExtra = style.textAlign === "justify" ? ";text-justify:inter-word" : "";
  return [
    `font-family:${style.fontFamily}`,
    `font-size:${style.fontSize}px`,
    `font-weight:${style.fontWeight}`,
    `font-style:${style.fontStyle}`,
    `text-align:${style.textAlign}`,
    `color:${style.color}`,
    `line-height:${style.lineHeight}`,
    `width:100%`,
    `margin:0`,
  ].join(";") + justifyExtra;
}

export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Alice&family=Cinzel:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:ital,wght@0,400;0,600;0,700;1,400&family=Roboto:ital,wght@0,400;0,500;0,700;1,400&display=swap";
