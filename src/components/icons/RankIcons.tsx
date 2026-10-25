import type { SVGProps } from "react";

/** Small filled icons for the top three; they inherit currentColor like Heroicons. */

export function CrownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3.2 7.6a1 1 0 0 1 1.55-.83l3.87 2.58 2.56-4.6a.95.95 0 0 1 1.64 0l2.56 4.6 3.87-2.58a1 1 0 0 1 1.55.83l-1.1 9.07A1.5 1.5 0 0 1 18.2 18H5.8a1.5 1.5 0 0 1-1.49-1.33L3.2 7.6Z" />
      <rect x="5" y="19.25" width="14" height="2" rx="1" />
    </svg>
  );
}

export function MedalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.5 2h3.4l2.4 4.8-2 2.8L6.5 2Zm11 0h-3.4l-1.4 2.8 2 4 2.8-6.8Z" fillOpacity=".65" />
      <circle cx="12" cy="15" r="6.5" />
      <circle cx="12" cy="15" r="3.6" fill="#fff" fillOpacity=".35" />
    </svg>
  );
}
