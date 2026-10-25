"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { Splash } from "@/components/brand/Splash";
import { Toaster } from "@/components/ui/Toaster";
import { useHydrated } from "@/hooks/useHydrated";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useLangSync } from "@/i18n/useLangSync";
import { useThemeSync } from "@/theme/useThemeSync";

/**
 * Mobile-sized frame on every screen size. Screens render only after
 * hydration because they read browser-saved state; the splash covers that
 * first frame.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useThemeSync();
  useLangSync();
  useServiceWorker();
  const hydrated = useHydrated();

  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg pt-[env(safe-area-inset-top)] sm:shadow-card">
        {hydrated && (
          <>
            {children}
            <AppNav />
            <Toaster />
          </>
        )}
      </div>
      <Splash />
    </>
  );
}
