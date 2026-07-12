import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { boldMarkdownToHtml, htmlFragmentToBoldMarkdown, parseBoldMarkdown } from "@/lib/rich-text";

type Props = {
  value: string;
  editing: boolean;
  style: CSSProperties;
  className?: string;
  onChange: (next: string) => void;
  onFinishEdit: () => void;
};

/** Renders body markdown; when editing, uses contentEditable with Ctrl/Cmd+B for bold. */
export function RichBodyText({ value, editing, style, className = "", onChange, onFinishEdit }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.innerHTML = boldMarkdownToHtml(value);
    ref.current.focus();
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed DOM only when entering edit
  }, [editing]);

  const commitFromDom = () => {
    if (!ref.current) return;
    onChange(htmlFragmentToBoldMarkdown(ref.current.innerHTML));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLParagraphElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      commitFromDom();
      onFinishEdit();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      document.execCommand("bold");
      commitFromDom();
    }
  };

  if (!editing) {
    const segments = parseBoldMarkdown(value);
    return (
      <p style={style} className={`w-full whitespace-pre-wrap ${className}`}>
        {segments.map((seg, i) =>
          seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>,
        )}
      </p>
    );
  }

  return (
    <p
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={{ ...style, outline: "none", cursor: "text" }}
      className={`w-full whitespace-pre-wrap ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onInput={() => {
        if (!ref.current) return;
        onChange(htmlFragmentToBoldMarkdown(ref.current.innerHTML));
      }}
      onBlur={() => {
        commitFromDom();
        onFinishEdit();
      }}
      onKeyDown={onKeyDown}
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
      <p style={style} className={`w-full ${multiline ? "whitespace-pre-wrap" : ""} ${className}`}>
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
    return <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} rows={3} {...shared} />;
  }
  return <input ref={ref as React.RefObject<HTMLInputElement>} type="text" {...shared} />;
}
