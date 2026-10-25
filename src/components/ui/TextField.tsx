import { useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Visually hide the label (it is still read by screen readers). */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
}

export function TextField({ label, hideLabel, error, hint, className = "", ...props }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-semibold"}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-12 w-full rounded-input border bg-surface px-3 text-base transition-colors duration-120 placeholder:text-text-muted/70 focus:outline-none focus-visible:outline-2 ${
          error ? "border-danger" : "border-border focus:border-primary-soft"
        }`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="animate-fade-in text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
