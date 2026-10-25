"use client";

import { HomeIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { NOT_FOUND_IMAGE } from "@/constants/brand";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n/useT";

/**
 * Shown for unknown addresses and for parts of the app that are not
 * available yet. The artwork already carries the "404" message, so the text
 * here is for screen readers plus a clear way back home.
 */
export function NotFoundScreen() {
  const { t } = useT();
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-not-found">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, no optimizer */}
      <img
        src={NOT_FOUND_IMAGE.src}
        width={NOT_FOUND_IMAGE.width}
        height={NOT_FOUND_IMAGE.height}
        alt=""
        className="absolute inset-0 h-full w-full animate-fade-in object-cover"
      />
      <h1 className="sr-only">{t("notFound.title")}</h1>
      <div className="relative mt-auto flex flex-col items-center gap-3 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-sm text-white/80">{t("notFound.body")}</p>
        <Link
          href={ROUTES.home}
          className="inline-flex min-h-14 items-center gap-2 rounded-button bg-accent px-6 text-lg font-semibold text-accent-fg transition-transform duration-120 active:scale-[0.97]"
        >
          <HomeIcon className="size-5" aria-hidden="true" />
          {t("notFound.home")}
        </Link>
      </div>
    </main>
  );
}
