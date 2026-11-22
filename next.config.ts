import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site (the app runs in the browser; data lives in Firebase) → `out/`,
  // served as static assets by Cloudflare Pages (free, unlimited static requests).
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
