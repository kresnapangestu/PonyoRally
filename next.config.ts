import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local-only app: no server, the build is a folder of static files.
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
