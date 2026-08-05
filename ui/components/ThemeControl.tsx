import { MODE_LABELS, MODES, type Mode } from "../theme";
import { Icon, type IconName } from "./Icon";

const MODE_ICONS: Record<Mode, IconName> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

interface Props {
  mode: Mode;
  onChoose: (mode: Mode) => void;
}

export function ThemeControl({ mode, onChoose }: Props) {
  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length]!;

  return (
    <button
      type="button"
      className="theme__cycle"
      aria-label={`Theme: ${MODE_LABELS[mode]}. Switch to ${MODE_LABELS[next]}.`}
      onClick={() => onChoose(next)}
    >
      <Icon name={MODE_ICONS[mode]} />
    </button>
  );
}
