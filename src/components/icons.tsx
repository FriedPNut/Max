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

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18.5 16.3v-5.6a6.5 6.5 0 1 0-13 0v5.6l-1.35 1.85c-.4.55 0 1.35.68 1.35h14.34c.68 0 1.08-.8.68-1.35L18.5 16.3Z" />
      <path d="M9.9 19.5a2.25 2.25 0 0 0 4.2 0" />
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

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m8.5 4.5 7.5 7.5-7.5 7.5" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 8.5 7.5 7.5 7.5-7.5" />
    </Svg>
  );
}
