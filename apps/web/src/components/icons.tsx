export interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Hand-rolled inline icon set. The repo has no icon library installed, and
 * this phase only needs a handful of glyphs, so each is a small inline SVG
 * instead of adding a new dependency. All are decorative by default
 * (aria-hidden) — add a visible label on the interactive element that wraps
 * them when the icon conveys meaning on its own.
 */
function iconProps({ size = 16, className = "" }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
    focusable: false as const,
    className,
  };
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M4 12h16M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ZapIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15.5 6.2a3.2 3.2 0 010 6.2M21 20c0-2.9-2-5.3-4.7-5.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M12 2c1 3-3 4-3 8a3 3 0 006 0c1.2 1 2 2.6 2 4.4A5.4 5.4 0 0112 20a5.4 5.4 0 01-5-7.4C7.6 9.6 10 8 12 2z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VerifiedIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M12 2l2.4 1.4 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8L22 12l-1.4 2.4.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22l-2.4-1.4-2.8.3-1.1-2.6-2.6-1.1.3-2.8L2 12l1.4-2.4-.3-2.8 2.6-1.1 1.1-2.6 2.8.3L12 2z"
        fill="currentColor"
      />
      <path
        d="M8.5 12.2l2.3 2.3 4.7-4.9"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M12 2l2.2 6.8H21l-5.6 4.1 2.1 6.9L12 15.7l-5.5 4.1 2.1-6.9L3 8.8h6.8L12 2z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="9" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 13h18M12 9v11" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 9c-1.5 0-4-1-4-3.2C8 4.2 9.2 3 10.5 3S12 5 12 6.5m0 2.5c1.5 0 4-1 4-3.2C16 4.2 14.8 3 13.5 3S12 5 12 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
