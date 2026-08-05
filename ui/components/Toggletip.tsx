import { useId, type ReactNode } from "react";
import { useDisclosure } from "./useDisclosure";

interface Props {
  label: string;
  place?: "left" | "right";
  children: ReactNode;
}

export function Toggletip({ label, place = "right", children }: Props) {
  const { open, setOpen, wrapper, trigger } = useDisclosure();
  const bubbleId = useId();

  return (
    <span className="toggletip" ref={wrapper}>
      <button
        type="button"
        ref={trigger}
        className="toggletip__trigger"
        aria-expanded={open}
        aria-controls={bubbleId}
        aria-label={label}
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true">i</span>
      </button>

      <span
        className="toggletip__live"
        data-place={place}
        role={open ? "status" : undefined}
      >
        {open ? (
          <span id={bubbleId} className="toggletip__bubble">
            {children}
          </span>
        ) : null}
      </span>
    </span>
  );
}
