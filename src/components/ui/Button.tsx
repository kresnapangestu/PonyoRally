import type { ButtonHTMLAttributes } from "react";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./button-styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({ variant, size, block, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${buttonStyles({ variant, size, block })} ${className}`} {...props} />;
}
