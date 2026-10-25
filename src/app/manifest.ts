import type { MetadataRoute } from "next";
import { APP_NAME } from "@/constants/brand";

export const dynamic = "force-static";

/** Lets the app be added to the home screen and open full-screen, like a native app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Atur Americano, Mexicano, dan Mixicano tenis dengan mudah.",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Shown by the OS while an installed app starts, before our own splash.
    background_color: "#06402B",
    theme_color: "#06402B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
