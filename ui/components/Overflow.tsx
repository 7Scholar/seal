import { useId, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useDisclosure } from "./useDisclosure";

interface Props {
  label: string;
  children: ReactNode;
}

export function Overflow({ label, children }: Props) {
  const { open, setOpen, wrapper, trigger } = useDisclosure();
  const menuId = useId();

  return (
    <span className="overflow" ref={wrapper}>
      <button
        type="button"
        ref={trigger}
        className="overflow__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="ellipsis-vertical" />
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
