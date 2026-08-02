export type IconName =
  | "chevron-up-down"
  | "chevron-down"
  | "chevron-right"
  | "ellipsis-vertical"
  | "check"
  | "plus"
  | "search"
  | "theme";

const PATHS: Record<IconName, string> = {
  "chevron-up-down": "M7 8.5 10 5l3 3.5M7 11.5l3 3.5 3-3.5",
  "chevron-down": "M5.5 8 10 12.5 14.5 8",
  "chevron-right": "M8 5.5 12.5 10 8 14.5",
  "ellipsis-vertical": "M10 5.5v.01M10 10v.01M10 14.5v.01",
  check: "m5 10.5 3.5 3.5L15 6.5",
  plus: "M10 5v10M5 10h10",
  search: "M13 13l3 3M8.75 14a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Z",
  theme: "M10 3.5v13a6.5 6.5 0 0 0 0-13Zm0 0a6.5 6.5 0 0 0 0 13",
};

interface Props {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: Props) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
