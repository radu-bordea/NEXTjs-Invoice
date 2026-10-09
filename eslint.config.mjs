import path from "node:path";

// Where your next-intl request config lives. Change to
// "./src/i18n/request.ts" if your i18n folder is inside src/.
const REQUEST_CONFIG = "./i18n/request.ts";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Same as what next-intl/plugin sets up, without loading @swc/core
  turbopack: {
    resolveAlias: {
      "next-intl/config": REQUEST_CONFIG,
    },
  },
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = config.resolve.alias ?? {};
    config.resolve.alias["next-intl/config"] = path.resolve(
      config.context,
      REQUEST_CONFIG,
    );
    return config;
  },
};

export default nextConfig;