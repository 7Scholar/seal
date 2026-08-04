import { useId } from "react";
import { MODE_LABELS, MODES, type Mode } from "../theme";
import { Icon } from "./Icon";
import { useDisclosure } from "./useDisclosure";

interface Props {
  mode: Mode;
  onChoose: (mode: Mode) => void;
}

export function ThemeControl({ mode, onChoose }: Props) {
  const { open, setOpen, wrapper, trigger, dismiss } = useDisclosure();
  const menuId = useId();

  return (
    <span className="theme" ref={wrapper}>
      <button
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Theme: ${MODE_LABELS[mode]}`}
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="theme" />
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
                dismiss();
              }}
            >
              <span className="theme__tick">
                {option === mode ? <Icon name="check" /> : null}
              </span>
              {MODE_LABELS[option]}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
