export type IconName =
  | "chevron-up-down"
  | "chevron-down"
  | "chevron-right"
  | "ellipsis-vertical"
  | "check"
  | "plus"
  | "search"
  | "sun"
  | "moon"
  | "monitor";

const PATHS: Record<IconName, string> = {
  "chevron-up-down": "M7 8.5 10 5l3 3.5M7 11.5l3 3.5 3-3.5",
  "chevron-down": "M5.5 8 10 12.5 14.5 8",
  "chevron-right": "M8 5.5 12.5 10 8 14.5",
  "ellipsis-vertical": "M10 5.5v.01M10 10v.01M10 14.5v.01",
  check: "m5 10.5 3.5 3.5L15 6.5",
  plus: "M10 5v10M5 10h10",
  search: "M13 13l3 3M8.75 14a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Z",
  sun: "M10 13.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM10 2.75v1.5M10 15.75v1.5M4.87 4.87l1.06 1.06M14.07 14.07l1.06 1.06M2.75 10h1.5M15.75 10h1.5M4.87 15.13l1.06-1.06M14.07 5.93l1.06-1.06",
  moon: "M16 12.35A6.75 6.75 0 0 1 7.65 4a6.75 6.75 0 1 0 8.35 8.35Z",
  monitor: "M4.25 4.75h11.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H4.25a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1ZM7.5 16.25h5M10 13.25v3",
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
