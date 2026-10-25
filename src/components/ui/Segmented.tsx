import { useId } from "react";

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
}

interface SegmentedProps<V extends string> {
  label: string;
  hideLabel?: boolean;
  options: SegmentOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** "track" = joined pills (2–3 options); "chips" = separate pills that wrap. */
  layout?: "track" | "chips";
  /** Tighter padding for use inside list rows; touch height stays 44px. */
  compact?: boolean;
}

/**
 * Single-choice control built on native radio inputs, so arrow keys, focus
 * and screen readers work without extra code.
 */
export function Segmented<V extends string>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  layout = "track",
  compact = false,
}: SegmentedProps<V>) {
  const name = useId();
  const track = layout === "track";

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={hideLabel ? "sr-only" : "mb-1.5 text-sm font-semibold"}>{label}</legend>
      <div className={track ? `flex gap-1 rounded-button bg-surface-2 ${compact ? "p-0.5" : "p-1"}` : "flex flex-wrap gap-2"}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`relative flex min-h-11 cursor-pointer select-none items-center justify-center rounded-[10px] text-sm font-semibold transition-[background-color,color,transform] duration-120 active:scale-[0.97] has-checked:bg-primary has-checked:text-primary-fg has-disabled:cursor-not-allowed has-disabled:opacity-40 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus ${
              compact ? "px-2" : "px-3"
            } ${track ? "flex-1 text-text-muted" : "min-w-14 border border-border bg-surface text-text"}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
