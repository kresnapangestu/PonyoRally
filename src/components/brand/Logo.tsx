import type { CSSProperties } from "react";
import { LOGO } from "@/constants/brand";

interface LogoProps {
  /** Omit for purely decorative use; the logo is then hidden from screen readers. */
  label?: string;
  className?: string;
}

const maskStyle: CSSProperties = {
  aspectRatio: `${LOGO.width} / ${LOGO.height}`,
  maskImage: `url(${LOGO.src})`,
  WebkitMaskImage: `url(${LOGO.src})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

/**
 * The court logo, painted in the current text color by using the supplied
 * image as a mask. White-on-transparent lines would vanish on light surfaces;
 * this keeps the exact artwork while following the theme (set text-* to tint).
 */
export function Logo({ label, className = "" }: LogoProps) {
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      style={maskStyle}
      className={`inline-block bg-current ${className}`}
    />
  );
}
