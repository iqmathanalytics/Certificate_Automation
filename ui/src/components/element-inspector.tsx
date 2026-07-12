import { useRef } from "react";
import {
  AlignCenter,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignHorizontalDistributeEnd,
  AlignHorizontalDistributeStart,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  AlignVerticalDistributeEnd,
  AlignVerticalDistributeStart,
  Bold,
  Italic,
  Minus,
  Plus,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FONT_OPTIONS } from "@/lib/certificate-fonts";
import {
  ELEMENT_LABELS,
  alignBoxHorizontal,
  alignBoxVertical,
  detectBoxAlignH,
  detectBoxAlignV,
  type CertificateElementId,
  type CertificateElementStyle,
} from "@/lib/certificate-layout";
import { toggleBoldInSelection } from "@/lib/rich-text";

type Props = {
  elementId: CertificateElementId;
  style: CertificateElementStyle;
  onChange: (next: CertificateElementStyle) => void;
  /** Body paragraph text (saved on template). Only used when elementId === "body". */
  bodyText?: string;
  onBodyTextChange?: (next: string) => void;
  /** Sample preview text for recipient / credential / date boxes. */
  previewText?: string;
  onPreviewTextChange?: (next: string) => void;
};

function ToggleBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function ElementInspector({
  elementId,
  style,
  onChange,
  bodyText,
  onBodyTextChange,
  previewText,
  onPreviewTextChange,
}: Props) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const patch = (partial: Partial<CertificateElementStyle>) => onChange({ ...style, ...partial });
  const boxAlignH = detectBoxAlignH(style);
  const boxAlignV = detectBoxAlignV(style);

  const applyInlineBold = () => {
    if (elementId !== "body" || bodyText == null || !onBodyTextChange || !bodyRef.current) return;
    const el = bodyRef.current;
    const result = toggleBoldInSelection(bodyText, el.selectionStart, el.selectionEnd);
    onBodyTextChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-primary">Editing: {ELEMENT_LABELS[elementId]}</p>

      {elementId === "body" && onBodyTextChange && bodyText != null ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="inspectorBody">Paragraph text</Label>
            <button
              type="button"
              title="Bold selection (or wrap with ** **)"
              onClick={(e) => {
                e.preventDefault();
                applyInlineBold();
              }}
              className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted"
            >
              <Bold className="h-3.5 w-3.5" />
              Bold
            </button>
          </div>
          <Textarea
            ref={bodyRef}
            id="inspectorBody"
            value={bodyText}
            onChange={(e) => onBodyTextChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                applyInlineBold();
              }
            }}
            rows={5}
            className="resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Select words and click Bold (or Ctrl/Cmd+B). Saved as **bold** markers on the certificate.
          </p>
        </div>
      ) : null}

      {elementId !== "body" && onPreviewTextChange && previewText != null ? (
        <div className="space-y-2">
          <Label htmlFor="inspectorPreview">Sample text (preview only)</Label>
          <Textarea
            id="inspectorPreview"
            value={previewText}
            onChange={(e) => onPreviewTextChange(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Changes here are for layout preview only — real values come from each certificate when issued.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Font</Label>
        <select
          value={style.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Font Size ({style.fontSize}px)</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
            onClick={() => patch({ fontSize: Math.max(6, style.fontSize - 1) })}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="range"
            min={6}
            max={120}
            step={0.5}
            value={style.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })}
            className="flex-1"
          />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
            onClick={() => patch({ fontSize: Math.min(120, style.fontSize + 1) })}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ToggleBtn
          title="Bold (entire box)"
          active={style.fontWeight >= 600}
          onClick={() => patch({ fontWeight: style.fontWeight >= 600 ? 400 : 700 })}
        >
          <Bold className="h-4 w-4" />
        </ToggleBtn>
        <ToggleBtn
          title="Italic"
          active={style.fontStyle === "italic"}
          onClick={() => patch({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })}
        >
          <Italic className="h-4 w-4" />
        </ToggleBtn>
      </div>

      <div className="space-y-2">
        <Label>Paragraph alignment</Label>
        <div className="flex flex-wrap gap-2">
          <ToggleBtn
            title="Align left"
            active={style.textAlign === "left"}
            onClick={() => patch({ textAlign: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Align center"
            active={style.textAlign === "center"}
            onClick={() => patch({ textAlign: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Align right"
            active={style.textAlign === "right"}
            onClick={() => patch({ textAlign: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Justify"
            active={style.textAlign === "justify"}
            onClick={() => patch({ textAlign: "justify" })}
          >
            <AlignJustify className="h-4 w-4" />
          </ToggleBtn>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Vertical alignment (within box)</Label>
        <div className="flex flex-wrap gap-2">
          <ToggleBtn
            title="Align top"
            active={style.verticalAlign === "top"}
            onClick={() => patch({ verticalAlign: "top" })}
          >
            <AlignStartVertical className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Align middle"
            active={style.verticalAlign === "center"}
            onClick={() => patch({ verticalAlign: "center" })}
          >
            <AlignVerticalDistributeCenter className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Align bottom"
            active={style.verticalAlign === "bottom"}
            onClick={() => patch({ verticalAlign: "bottom" })}
          >
            <AlignEndVertical className="h-4 w-4" />
          </ToggleBtn>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Box align (on certificate)</Label>
        <div className="flex flex-wrap gap-2">
          <ToggleBtn
            title="Box align left"
            active={boxAlignH === "left"}
            onClick={() => onChange(alignBoxHorizontal(style, "left"))}
          >
            <AlignHorizontalDistributeStart className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Box align center"
            active={boxAlignH === "center"}
            onClick={() => onChange(alignBoxHorizontal(style, "center"))}
          >
            <AlignHorizontalDistributeCenter className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Box align right"
            active={boxAlignH === "right"}
            onClick={() => onChange(alignBoxHorizontal(style, "right"))}
          >
            <AlignHorizontalDistributeEnd className="h-4 w-4" />
          </ToggleBtn>
          <span className="mx-1 w-px self-stretch bg-border" />
          <ToggleBtn
            title="Box align top"
            active={boxAlignV === "top"}
            onClick={() => onChange(alignBoxVertical(style, "top"))}
          >
            <AlignVerticalDistributeStart className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Box align middle"
            active={boxAlignV === "center"}
            onClick={() => onChange(alignBoxVertical(style, "center"))}
          >
            <AlignVerticalDistributeCenter className="h-4 w-4" />
          </ToggleBtn>
          <ToggleBtn
            title="Box align bottom"
            active={boxAlignV === "bottom"}
            onClick={() => onChange(alignBoxVertical(style, "bottom"))}
          >
            <AlignVerticalDistributeEnd className="h-4 w-4" />
          </ToggleBtn>
        </div>
        <p className="text-xs text-muted-foreground">
          Snaps the text box to the left, center, or right of the certificate page.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Text Color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style.color}
            onChange={(e) => patch({ color: e.target.value })}
            className="h-10 w-12 cursor-pointer rounded border border-input"
          />
          <input
            type="text"
            value={style.color}
            onChange={(e) => patch({ color: e.target.value })}
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Line Height ({style.lineHeight})</Label>
        <input
          type="range"
          min={0.8}
          max={2.5}
          step={0.05}
          value={style.lineHeight}
          onChange={(e) => patch({ lineHeight: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Box Width ({style.width.toFixed(1)}%)</Label>
          <input
            type="range"
            min={10}
            max={90}
            step={0.5}
            value={style.width}
            onChange={(e) => patch({ width: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Box Height ({style.height.toFixed(1)}%)</Label>
          <input
            type="range"
            min={4}
            max={50}
            step={0.5}
            value={style.height}
            onChange={(e) => patch({ height: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
