import { useEffect, useId, useRef, useState } from "react";
import { MODE_LABELS, MODES, type Mode } from "../theme";

interface Props {
  mode: Mode;
  onChoose: (mode: Mode) => void;
}

export function ThemeControl({ mode, onChoose }: Props) {
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
    <span className="theme" ref={wrapper}>
      <button
        type="button"
        ref={button}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Theme: ${MODE_LABELS[mode]}`}
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true">◐</span>
      </button>

      {open ? (
        <span id={menuId} className="theme__menu">
          {MODES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === mode}
              onClick={() => {
                onChoose(option);
                setOpen(false);
                button.current?.focus();
              }}
            >
              <span className="theme__tick" aria-hidden="true">
                {option === mode ? "✓" : ""}
              </span>
              {MODE_LABELS[option]}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
