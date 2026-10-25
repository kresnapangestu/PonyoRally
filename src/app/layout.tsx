import type { Metadata, Viewport } from "next";
import { Funnel_Display } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { APP_NAME, THEME_COLOR } from "@/constants/brand";
import { DEFAULT_LANGUAGE } from "@/i18n/languages";
import { bootScript } from "@/theme/theme-script";
import "./globals.css";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Atur Americano, Mexicano, dan Mixicano tenis dengan mudah.",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Updated at runtime to the resolved theme by the boot script.
  themeColor: THEME_COLOR.light,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={DEFAULT_LANGUAGE}
      data-theme="light"
      className={funnelDisplay.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
