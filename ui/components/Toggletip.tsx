import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export function Toggletip({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const bubbleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    }

    function onPointerDown(event: MouseEvent) {
      if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <span className="toggletip" ref={wrapper}>
      <button
        type="button"
        ref={button}
        className="toggletip__trigger"
        aria-expanded={open}
        aria-controls={bubbleId}
        aria-label={label}
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true">i</span>
      </button>

      <span className="toggletip__live" role={open ? "status" : undefined}>
        {open ? (
          <span id={bubbleId} className="toggletip__bubble">
            {children}
          </span>
        ) : null}
      </span>
    </span>
  );
}
