export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-button font-semibold " +
  "transition-[transform,background-color,opacity] duration-120 ease-standard " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg",
  secondary: "bg-surface-2 text-primary-soft",
  ghost: "text-primary-soft active:bg-surface-2",
  danger: "bg-danger text-white",
};

// md = minimum touch target (48px), lg = primary actions (56px).
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
};

/** Shared so links styled as buttons stay identical to real buttons. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  block = false,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean } = {}) {
  return [BASE, VARIANTS[variant], SIZES[size], block ? "w-full" : ""].join(" ");
}
