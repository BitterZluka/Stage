import type { ReactNode } from "react";
import Link from "next/link";

export type ButtonVariant =
  "primary" | "holo" | "cyan" | "pink" | "ghost" | "mint" | "lavender";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-[#e5e7eb] text-black border-black",
  holo: "text-black border-black bg-gradient-to-br from-stage-cyan via-stage-pink to-stage-lavender",
  cyan: "bg-stage-cyan text-black border-black",
  pink: "bg-stage-pink text-black border-black",
  ghost: "bg-white text-black border-black hover:bg-black/5",
  mint: "bg-stage-mint text-black border-black",
  lavender: "bg-stage-lavender text-black border-black",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-base px-5 py-2.5 gap-1.5",
  md: "text-base px-6 py-3 gap-2",
  lg: "text-lg px-8 py-4 gap-2",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-xl border border-black/80 font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.9)] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

interface ButtonAsButton extends CommonProps {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}

interface ButtonAsLink extends CommonProps {
  href: string;
}

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { children, variant = "primary", size = "md", className = "" } = props;
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", onClick, disabled } = props as ButtonAsButton;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${classes} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
