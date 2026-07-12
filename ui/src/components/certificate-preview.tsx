import { useRef, useState, useEffect } from "react";
import { EditableTextBox, textStyleProps } from "@/components/editable-text-box";
import { GOOGLE_FONTS_URL } from "@/lib/certificate-fonts";
import {
  DEFAULT_CERTIFICATE_LAYOUT,
  parseLayoutConfig,
  type CertificateElementId,
  type CertificateElementStyle,
  type CertificateLayoutConfig,
} from "@/lib/certificate-layout";
import { formatRecipientName, formatCertificateDate } from "@/lib/certificate-utils";

export type CertificatePreviewData = {
  recipientName: string;
  credentialId: string;
  issuedOn?: string;
};

export type CertificateBrandingOverrides = {
  bodyTemplate?: string;
  templateImageUrl?: string;
};

type Props = {
  data: CertificatePreviewData;
  className?: string;
  overrides?: CertificateBrandingOverrides;
  editableLayout?: boolean;
  layoutConfig?: CertificateLayoutConfig;
  selectedElement?: CertificateElementId | null;
  onSelectElement?: (id: CertificateElementId | null) => void;
  onLayoutConfigChange?: (config: CertificateLayoutConfig) => void;
};

function resolveLayout(config?: CertificateLayoutConfig): CertificateLayoutConfig {
  if (!config) return { ...DEFAULT_CERTIFICATE_LAYOUT };
  return parseLayoutConfig(JSON.stringify(config));
}

export function CertificatePreview({
  data,
  className = "",
  overrides = {},
  editableLayout = false,
  layoutConfig,
  selectedElement = null,
  onSelectElement,
  onLayoutConfigChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const layout = resolveLayout(layoutConfig);
  const imgSrc = overrides.templateImageUrl ?? `${import.meta.env.BASE_URL}certificate-template.png`;
  const bodyText = overrides.bodyTemplate ?? "";
  const issuedLabel = data.issuedOn ? formatCertificateDate(data.issuedOn) : formatCertificateDate(new Date().toISOString());

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setScale(el.getBoundingClientRect().width / 842);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateElement = (id: CertificateElementId, next: CertificateElementStyle) => {
    const current = layoutConfig ?? DEFAULT_CERTIFICATE_LAYOUT;
    onLayoutConfigChange?.({ ...current, [id]: next });
  };

  const handleCanvasClick = () => {
    if (editableLayout) onSelectElement?.(null);
  };

  return (
    <div
      ref={canvasRef}
      className={`relative w-full overflow-hidden rounded-lg shadow-lg select-none ${className}`}
      style={{ aspectRatio: "842 / 595" }}
      onClick={handleCanvasClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />

      <img
        src={imgSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      <EditableTextBox
        canvasRef={canvasRef}
        editable={editableLayout}
        selected={selectedElement === "recipient"}
        style={layout.recipient}
        onSelect={() => onSelectElement?.("recipient")}
        onStyleChange={(next) => updateElement("recipient", next)}
      >
        <p style={textStyleProps(layout.recipient, scale)} className="w-full">
          {formatRecipientName(data.recipientName)}
        </p>
      </EditableTextBox>

      <EditableTextBox
        canvasRef={canvasRef}
        editable={editableLayout}
        selected={selectedElement === "body"}
        style={layout.body}
        onSelect={() => onSelectElement?.("body")}
        onStyleChange={(next) => updateElement("body", next)}
      >
        <p style={textStyleProps(layout.body, scale)} className="w-full whitespace-pre-wrap">
          {bodyText}
        </p>
      </EditableTextBox>

      <EditableTextBox
        canvasRef={canvasRef}
        editable={editableLayout}
        selected={selectedElement === "credential"}
        style={layout.credential}
        onSelect={() => onSelectElement?.("credential")}
        onStyleChange={(next) => updateElement("credential", next)}
      >
        <p style={textStyleProps(layout.credential, scale)} className="w-full">
          <span style={{ fontWeight: 700, fontSize: `${(layout.credential.fontSize - 1) * scale}px` }}>
            Certificate No:
          </span>
          <span> {data.credentialId}</span>
        </p>
      </EditableTextBox>

      <EditableTextBox
        canvasRef={canvasRef}
        editable={editableLayout}
        selected={selectedElement === "issuedDate"}
        style={layout.issuedDate}
        onSelect={() => onSelectElement?.("issuedDate")}
        onStyleChange={(next) => updateElement("issuedDate", next)}
      >
        <p style={textStyleProps(layout.issuedDate, scale)} className="w-full">
          <span style={{ fontWeight: 700, fontSize: `${(layout.issuedDate.fontSize - 1) * scale}px` }}>
            Issued:
          </span>
          <span> {issuedLabel}</span>
        </p>
      </EditableTextBox>
    </div>
  );
}
