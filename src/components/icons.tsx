import type { ReactNode, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  size?: number;
};

function Svg({
  size = 24,
  strokeWidth = 1.75,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

function FilledSvg({
  size = 24,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      focusable="false"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Events tab, inactive. */
export function EventsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.25" y="4.75" width="17.5" height="16" rx="4" />
      <path d="M8 2.75v3.5M16 2.75v3.5M3.25 9.75h17.5" />
      <path
        d="M8.25 14h.01M12 14h.01M15.75 14h.01M8.25 17.5h.01M12 17.5h.01"
        strokeWidth={2.1}
      />
    </Svg>
  );
}

/** Events tab, active. */
export function EventsFilledIcon(props: IconProps) {
  return (
    <FilledSvg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 2.75c.55 0 1 .45 1 1V5h6V3.75a1 1 0 1 1 2 0V5h.25A3.75 3.75 0 0 1 21 8.75v8.5A3.75 3.75 0 0 1 17.25 21H6.75A3.75 3.75 0 0 1 3 17.25v-8.5A3.75 3.75 0 0 1 6.75 5H7V3.75c0-.55.45-1 1-1Zm.25 8.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.75 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.75 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
      />
    </FilledSvg>
  );
}

/** Chat tab, inactive. */
export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m21.5 2.5-8.1 19a.6.6 0 0 1-1.1.05L9.4 14.6 2.45 11.7a.6.6 0 0 1 .05-1.1l19-8.1a.5.5 0 0 1 .65.65Z" />
      <path d="m9.4 14.6 4.6-4.6" />
    </Svg>
  );
}

/** Chat tab, active. */
export function ChatFilledIcon(props: IconProps) {
  return (
    <FilledSvg {...props}>
      <path d="m21.5 2.5-8.1 19a.6.6 0 0 1-1.1.05L9.4 14.6 2.45 11.7a.6.6 0 0 1 .05-1.1l19-8.1a.5.5 0 0 1 .65.65Z" />
    </FilledSvg>
  );
}

/** Post tab, inactive. */
export function PostIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.25" />
      <path d="M12 7.75v8.5M7.75 12h8.5" />
    </Svg>
  );
}

/** Post tab, active. */
export function PostFilledIcon(props: IconProps) {
  return (
    <FilledSvg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.25 3h7.5A5.25 5.25 0 0 1 21 8.25v7.5A5.25 5.25 0 0 1 15.75 21h-7.5A5.25 5.25 0 0 1 3 15.75v-7.5A5.25 5.25 0 0 1 8.25 3Zm3.75 4.75a1 1 0 0 0-1 1V11H9.75a1 1 0 1 0 0 2H11v2.25a1 1 0 1 0 2 0V13h2.25a1 1 0 1 0 0-2H13V8.75a1 1 0 0 0-1-1Z"
      />
    </FilledSvg>
  );
}

/** Notifications entry, outline heart. */
export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.25s-7.5-4.6-7.5-10.1A4.15 4.15 0 0 1 12 7.6a4.15 4.15 0 0 1 7.5 2.55c0 5.5-7.5 10.1-7.5 10.1Z" />
    </Svg>
  );
}

/** Two-line "more" icon: a long line over a shorter one. */
export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 9.5h15M8.5 14.5h7" />
    </Svg>
  );
}

/** Person with a plus sign. */
export function PersonPlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9.5" cy="8" r="3.75" />
      <path d="M3 20c.6-3.4 3.2-5.25 6.5-5.25S15.4 16.6 16 20M19 8v6M16 11h6" />
    </Svg>
  );
}

/** Picture frame with a mountain and sun. */
export function ImageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4.5" />
      <circle cx="8.75" cy="8.75" r="1.5" />
      <path d="m3.5 16.5 4.75-4.5a1.2 1.2 0 0 1 1.65 0l4.1 3.9 1.5-1.4a1.2 1.2 0 0 1 1.65 0l3.35 3.1" />
    </Svg>
  );
}

/** Grid of four squares. */
export function GridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.75" y="3.75" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.75" y="3.75" width="6.5" height="6.5" rx="1.5" />
      <rect x="3.75" y="13.75" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.75" y="13.75" width="6.5" height="6.5" rx="1.5" />
    </Svg>
  );
}

/** Calendar page. */
export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.25" y="4.75" width="17.5" height="16" rx="4" />
      <path d="M8 2.75v3.5M16 2.75v3.5M3.25 9.75h17.5" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.75v14.5M4.75 12h14.5" />
    </Svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 4.5 7.5 12l7.5 7.5" />
    </Svg>
  );
}
