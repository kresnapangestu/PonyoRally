import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { buttonStyles } from "./button-styles";

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}

/** − value + control: no keyboard popping up for a small number. */
export function Stepper({ label, value, min, max, onChange, decreaseLabel, increaseLabel }: StepperProps) {
  const control = `${buttonStyles({ variant: "secondary" })} size-12 px-0`;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        <button
          type="button"
          className={control}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`${decreaseLabel} ${label}`}
        >
          <MinusIcon className="size-5" aria-hidden="true" />
        </button>
        <output aria-live="polite" className="tabular w-12 text-center text-xl font-bold">
          {value}
        </output>
        <button
          type="button"
          className={control}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`${increaseLabel} ${label}`}
        >
          <PlusIcon className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
