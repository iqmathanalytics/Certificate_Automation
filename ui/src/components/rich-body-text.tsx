import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { dedupeRepeatedBody, parseBoldMarkdown, toggleBoldInSelection } from "@/lib/rich-text";

type Props = {
  value: string;
  editing: boolean;
  style: CSSProperties;
  className?: string;
  onChange: (next: string) => void;
  onFinishEdit: () => void;
};

/**
 * Renders body markdown (`**bold**`).
 * Editing uses a textarea (not contentEditable) so React never mixes
 * imperative innerHTML with VDOM children — that bug duplicated the paragraph.
 */
export function RichBodyText({ value, editing, style, className = "", onChange, onFinishEdit }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) return;
    setDraft(value);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    // Seed draft only when entering edit mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = (next: string = draft) => {
    onChange(next);
  };

  const applyBold = () => {
    const el = ref.current;
    if (!el) return;
    const result = toggleBoldInSelection(draft, el.selectionStart, el.selectionEnd);
    setDraft(result.value);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  if (!editing) {
    const segments = parseBoldMarkdown(dedupeRepeatedBody(value));
    return (
      <p key="view" style={style} className={`w-full whitespace-pre-wrap ${className}`}>
        {segments.map((seg, i) =>
          seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>,
        )}
      </p>
    );
  }

  return (
    <textarea
      key="edit"
      ref={ref}
      value={draft}
      rows={4}
      style={{
        ...style,
        outline: "none",
        border: "none",
        resize: "none",
        cursor: "text",
        background: "transparent",
        overflow: "auto",
        display: "block",
      }}
      className={`w-full ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => {
        commit();
        onFinishEdit();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Escape") {
          e.preventDefault();
          commit();
          onFinishEdit();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
          e.preventDefault();
          applyBold();
        }
      }}
    />
  );
}

type PlainProps = {
  value: string;
  editing: boolean;
  style: CSSProperties;
  className?: string;
  onChange: (next: string) => void;
  onFinishEdit: () => void;
  multiline?: boolean;
};

/** Plain single-line (or multi) text edit for recipient / credential / date samples. */
export function InlinePlainText({
  value,
  editing,
  style,
  className = "",
  onChange,
  onFinishEdit,
  multiline = false,
}: PlainProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => {
        ref.current?.focus();
        ref.current?.select();
      });
    }
  }, [editing, value]);

  if (!editing) {
    return (
      <p key="view" style={style} className={`w-full ${multiline ? "whitespace-pre-wrap" : ""} ${className}`}>
        {value}
      </p>
    );
  }

  const shared = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      onChange(e.target.value);
    },
    onBlur: () => {
      onChange(draft);
      onFinishEdit();
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Escape" || (e.key === "Enter" && !multiline && !e.shiftKey)) {
        e.preventDefault();
        onChange(draft);
        onFinishEdit();
      }
    },
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    className: `w-full bg-transparent ${className}`,
    style: { ...style, outline: "none", border: "none", resize: "none" as const, cursor: "text" },
  };

  if (multiline) {
    return <textarea key="edit" ref={ref as React.RefObject<HTMLTextAreaElement>} rows={3} {...shared} />;
  }
  return <input key="edit" ref={ref as React.RefObject<HTMLInputElement>} type="text" {...shared} />;
}
