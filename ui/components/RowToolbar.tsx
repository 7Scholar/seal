import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

interface Props {
  label: string;
  className?: string;
  children: ReactNode;
}

function focusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>("button, input")].filter(
    (element) => !element.hasAttribute("disabled"),
  );
}

export function RowToolbar({ label, className, children }: Props) {
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controls = focusable(region.current);
    if (controls.length === 0) return;
    const held = controls.find((control) => control.tabIndex === 0);
    for (const control of controls) control.tabIndex = -1;
    const entry = held ?? controls[0];
    if (entry) entry.tabIndex = 0;
  });

  function hold(target: HTMLElement) {
    for (const control of focusable(region.current)) control.tabIndex = -1;
    target.tabIndex = 0;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const controls = focusable(region.current);
    if (controls.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    if (active instanceof HTMLInputElement && event.key !== "Home" && event.key !== "End") {
      return;
    }

    const current = active ? controls.indexOf(active) : -1;
    let next = current;
    if (event.key === "ArrowRight") next = current + 1;
    if (event.key === "ArrowLeft") next = current - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = controls.length - 1;

    if (next < 0) next = controls.length - 1;
    if (next >= controls.length) next = 0;

    const target = controls[next];
    if (!target) return;
    event.preventDefault();
    hold(target);
    target.focus();
  }

  return (
    <div
      ref={region}
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      className={className}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        const target = event.target as HTMLElement;
        if (focusable(region.current).includes(target)) hold(target);
      }}
    >
      {children}
    </div>
  );
}
