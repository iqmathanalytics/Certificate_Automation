import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { verticalAlignToFlex, type CertificateElementStyle } from "@/lib/certificate-layout";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

const HANDLE_POSITIONS: Record<ResizeHandle, CSSProperties> = {
  nw: { top: -5, left: -5 },
  n: { top: -5, left: "50%", transform: "translateX(-50%)" },
  ne: { top: -5, right: -5 },
  e: { top: "50%", right: -5, transform: "translateY(-50%)" },
  se: { bottom: -5, right: -5 },
  s: { bottom: -5, left: "50%", transform: "translateX(-50%)" },
  sw: { bottom: -5, left: -5 },
  w: { top: "50%", left: -5, transform: "translateY(-50%)" },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type Props = {
  selected: boolean;
  editable: boolean;
  editing?: boolean;
  style: CertificateElementStyle;
  onSelect: () => void;
  onStartEdit?: () => void;
  onStyleChange: (next: CertificateElementStyle) => void;
  children: ReactNode;
  canvasRef: React.RefObject<HTMLDivElement | null>;
};

type Interaction =
  | {
      kind: "drag";
      pointerId: number;
      startX: number;
      startY: number;
      origin: CertificateElementStyle;
      moved: boolean;
    }
  | {
      kind: "resize";
      handle: ResizeHandle;
      pointerId: number;
      startX: number;
      startY: number;
      origin: CertificateElementStyle;
    };

export function EditableTextBox({
  selected,
  editable,
  editing = false,
  style,
  onSelect,
  onStartEdit,
  onStyleChange,
  children,
  canvasRef,
}: Props) {
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const styleRef = useRef(style);
  styleRef.current = style;

  useEffect(() => {
    if (!interaction) return;

    const onMove = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== interaction.pointerId || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - interaction.startX) / rect.width) * 100;
      const dy = ((e.clientY - interaction.startY) / rect.height) * 100;
      const o = interaction.origin;
      const current = styleRef.current;

      if (interaction.kind === "drag") {
        if (!interaction.moved && Math.hypot(dx, dy) < 0.35) return;
        if (!interaction.moved) {
          setInteraction({ ...interaction, moved: true });
        }
        onStyleChange({
          ...current,
          x: clamp(o.x + dx, 0, 100 - o.width),
          y: clamp(o.y + dy, 0, 100 - o.height),
        });
        return;
      }

      const h = interaction.handle;
      let { x, y, width, height } = o;

      if (h.includes("e")) width = clamp(o.width + dx, 8, 100 - o.x);
      if (h.includes("w")) {
        const newWidth = clamp(o.width - dx, 8, o.x + o.width);
        x = clamp(o.x + o.width - newWidth, 0, 100 - 8);
        width = newWidth;
      }
      if (h.includes("s")) height = clamp(o.height + dy, 4, 100 - o.y);
      if (h.includes("n")) {
        const newHeight = clamp(o.height - dy, 4, o.y + o.height);
        y = clamp(o.y + o.height - newHeight, 0, 100 - 4);
        height = newHeight;
      }

      onStyleChange({ ...current, x, y, width, height });
    };

    const onUp = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== interaction.pointerId) return;
      // Click without drag on an already-selected box → enter text edit
      if (
        interaction.kind === "drag" &&
        !interaction.moved &&
        selected &&
        onStartEdit
      ) {
        onStartEdit();
      }
      setInteraction(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [interaction, canvasRef, onStyleChange, onStartEdit, selected]);

  const startDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!editable || interaction || editing) return;
    e.stopPropagation();
    onSelect();
    setInteraction({
      kind: "drag",
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: style,
      moved: false,
    });
  };

  const startResize = (handle: ResizeHandle, e: PointerEvent<HTMLDivElement>) => {
    if (!editable || editing) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setInteraction({
      kind: "resize",
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: style,
    });
  };

  return (
    <div
      className={`absolute z-10 ${selected && editable ? "z-20" : ""}`}
      style={{
        left: `${style.x}%`,
        top: `${style.y}%`,
        width: `${style.width}%`,
        height: `${style.height}%`,
        touchAction: editing ? "auto" : "none",
      }}
      onPointerDown={startDrag}
      onDoubleClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        e.preventDefault();
        onSelect();
        onStartEdit?.();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`relative h-full w-full ${
          editable
            ? selected
              ? "overflow-visible ring-2 ring-primary ring-offset-1"
              : "overflow-visible ring-1 ring-transparent hover:ring-primary/40"
            : "overflow-visible"
        } ${editable && !editing ? "cursor-move" : ""} ${editing ? "cursor-text" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: verticalAlignToFlex(style.verticalAlign),
        }}
      >
        <div className="w-full min-w-0">{children}</div>

        {editable &&
          selected &&
          !editing &&
          HANDLES.map((handle) => (
            <div
              key={handle}
              className="absolute z-30 h-2.5 w-2.5 rounded-sm border border-primary bg-white shadow-sm"
              style={{ ...HANDLE_POSITIONS[handle], cursor: HANDLE_CURSORS[handle] }}
              onPointerDown={(e) => startResize(handle, e)}
            />
          ))}
      </div>
    </div>
  );
}

export function textStyleProps(style: CertificateElementStyle, scale: number): CSSProperties {
  return {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize * scale}px`,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    color: style.color,
    lineHeight: style.lineHeight,
    width: "100%",
    margin: 0,
    ...(style.textAlign === "justify" ? { textJustify: "inter-word" } : {}),
  };
}
