import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export function Overflow({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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
    <span className="overflow" ref={wrapper}>
      <button
        type="button"
        ref={button}
        className="overflow__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true">···</span>
      </button>

      {open ? (
        <span
          id={menuId}
          className="overflow__menu"
          onClick={() => setOpen(false)}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
