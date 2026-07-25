export interface ButtonStyleOptions {
  intent?: "primary" | "secondary";
  disabled?: boolean;
}

export function buttonClassName(options: ButtonStyleOptions = {}): string {
  const intent = options.intent ?? "primary";
  return [
    "cp-button",
    `cp-button--${intent}`,
    options.disabled && "is-disabled",
  ]
    .filter(Boolean)
    .join(" ");
}
