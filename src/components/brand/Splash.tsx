"use client";

import { SPLASH_IMAGE } from "@/constants/brand";
import { useSplash } from "./useSplash";

/**
 * First-load brand screen. Rendered in the static HTML so the artwork is the
 * very first thing painted, before any JavaScript runs. The image fills a
 * phone screen; on wider screens it stays phone-sized and the matching
 * background color fills the rest.
 */
export function Splash() {
  const phase = useSplash();
  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`splash fixed inset-0 z-50 flex justify-center overflow-hidden bg-splash ${
        phase === "leaving" ? "animate-fade-out" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, no optimizer */}
      <img
        src={SPLASH_IMAGE.src}
        width={SPLASH_IMAGE.width}
        height={SPLASH_IMAGE.height}
        alt=""
        className="h-full w-full max-w-[440px] animate-splash-in object-cover"
        fetchPriority="high"
      />
    </div>
  );
}
