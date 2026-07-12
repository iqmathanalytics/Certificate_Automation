import { useRef, useState, useEffect } from "react";
import { EditableTextBox, textStyleProps } from "@/components/editable-text-box";
import { InlinePlainText, RichBodyText } from "@/components/rich-body-text";
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
  onBodyTemplateChange?: (body: string) => void;
  onPreviewDataChange?: (data: CertificatePreviewData) => void;
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
  onBodyTemplateChange,
  onPreviewDataChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [editingElement, setEditingElement] = useState<CertificateElementId | null>(null);
  const layout = resolveLayout(layoutConfig);
  const imgSrc = overrides.templateImageUrl ?? `${import.meta.env.BASE_URL}certificate-template.png`;
  const bodyText = overrides.bodyTemplate ?? "";
  const issuedLabel = data.issuedOn
    ? formatCertificateDate(data.issuedOn)
    : formatCertificateDate(new Date().toISOString());

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setScale(el.getBoundingClientRect().width / 842);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setEditingElement((prev) => (prev && prev !== selectedElement ? null : prev));
  }, [selectedElement]);

  const updateElement = (id: CertificateElementId, next: CertificateElementStyle) => {
    const current = layoutConfig ?? DEFAULT_CERTIFICATE_LAYOUT;
    onLayoutConfigChange?.({ ...current, [id]: next });
  };

  const handleCanvasClick = () => {
    if (!editableLayout) return;
    setEditingElement(null);
    onSelectElement?.(null);
  };

  const startEdit = (id: CertificateElementId) => {
    onSelectElement?.(id);
    setEditingElement(id);
  };

  const finishEdit = () => setEditingElement(null);

  return (
    <div
      ref={canvasRef}
      className={`relative w-full overflow-hidden rounded-lg shadow-lg ${editingElement ? "" : "select-none"} ${className}`}
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
        editing={editingElement === "recipient"}
        selected={selectedElement === "recipient"}
        style={layout.recipient}
        onSelect={() => onSelectElement?.("recipient")}
        onStartEdit={() => startEdit("recipient")}
        onStyleChange={(next) => updateElement("recipient", next)}
      >
        {editableLayout && onPreviewDataChange ? (
          <InlinePlainText
            value={formatRecipientName(data.recipientName)}
            editing={editingElement === "recipient"}
            style={textStyleProps(layout.recipient, scale)}
            onChange={(next) => onPreviewDataChange({ ...data, recipientName: next })}
            onFinishEdit={finishEdit}
          />
        ) : (
          <p style={textStyleProps(layout.recipient, scale)} className="w-full">
            {formatRecipientName(data.recipientName)}
          </p>
        )}
      </EditableTextBox>

      <EditableTextBox
        canvasRef={canvasRef}
        editable={editableLayout}
        editing={editingElement === "body"}
        selected={selectedElement === "body"}
        style={layout.body}
        onSelect={() => onSelectElement?.("body")}
        onStartEdit={() => startEdit("body")}
        onStyleChange={(next) => updateElement("body", next)}
      >
        {editableLayout && onBodyTemplateChange ? (
          <RichBodyText
            value={bodyText}
            editing={editingElement === "body"}
            style={textStyleProps(layout.body, scale)}
            onChange={onBodyTemplateChange}
            onFinishEdit={finishEdit}
          />
        ) : (
          <RichBodyText
            value={bodyText}
            editing={false}
            style={textStyleProps(layout.body, scale)}
            onChange={() => {}}
            onFinishEdit={() => {}}
          />
        )}
      </EditableTextBox>

      <EditableTextBox
        canvasRef={canvasRef}
        editable={editableLayout}
        editing={editingElement === "credential"}
        selected={selectedElement === "credential"}
        style={layout.credential}
        onSelect={() => onSelectElement?.("credential")}
        onStartEdit={() => startEdit("credential")}
        onStyleChange={(next) => updateElement("credential", next)}
      >
        {editableLayout && onPreviewDataChange && editingElement === "credential" ? (
          <div className="flex w-full flex-wrap items-baseline gap-x-1" style={textStyleProps(layout.credential, scale)}>
            <span style={{ fontWeight: 700, fontSize: `${(layout.credential.fontSize - 1) * scale}px` }}>
              Certificate No:
            </span>
            <InlinePlainText
              value={data.credentialId}
              editing
              style={{
                ...textStyleProps(layout.credential, scale),
                width: "auto",
                flex: 1,
                minWidth: "4ch",
              }}
              onChange={(next) => onPreviewDataChange({ ...data, credentialId: next })}
              onFinishEdit={finishEdit}
            />
          </div>
        ) : (
          <p style={textStyleProps(layout.credential, scale)} className="w-full">
            <span style={{ fontWeight: 700, fontSize: `${(layout.credential.fontSize - 1) * scale}px` }}>
              Certificate No:
            </span>
            <span> {data.credentialId}</span>
          </p>
        )}
      </EditableTextBox>

      <EditableTextBox
        canvasRef={canvasRef}
        editable={editableLayout}
        editing={editingElement === "issuedDate"}
        selected={selectedElement === "issuedDate"}
        style={layout.issuedDate}
        onSelect={() => onSelectElement?.("issuedDate")}
        onStartEdit={() => startEdit("issuedDate")}
        onStyleChange={(next) => updateElement("issuedDate", next)}
      >
        {editableLayout && onPreviewDataChange && editingElement === "issuedDate" ? (
          <div className="flex w-full flex-wrap items-baseline gap-x-1" style={textStyleProps(layout.issuedDate, scale)}>
            <span style={{ fontWeight: 700, fontSize: `${(layout.issuedDate.fontSize - 1) * scale}px` }}>
              Issued:
            </span>
            <InlinePlainText
              value={issuedLabel}
              editing
              style={{
                ...textStyleProps(layout.issuedDate, scale),
                width: "auto",
                flex: 1,
                minWidth: "4ch",
              }}
              onChange={(next) =>
                onPreviewDataChange({
                  ...data,
                  // keep ISO if possible; otherwise store display string as issuedOn for preview only
                  issuedOn: next,
                })
              }
              onFinishEdit={finishEdit}
            />
          </div>
        ) : (
          <p style={textStyleProps(layout.issuedDate, scale)} className="w-full">
            <span style={{ fontWeight: 700, fontSize: `${(layout.issuedDate.fontSize - 1) * scale}px` }}>
              Issued:
            </span>
            <span> {issuedLabel}</span>
          </p>
        )}
      </EditableTextBox>
    </div>
  );
}
