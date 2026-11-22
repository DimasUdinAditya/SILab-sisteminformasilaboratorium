import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Off: every signed-in page reads the session on the client, so there is no static shell to validate.
  cacheComponents: false,
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
