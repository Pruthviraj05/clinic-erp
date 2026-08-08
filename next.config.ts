import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tree-shake large libraries so only the icons/components actually used are
  // bundled — meaningfully reduces client JS on chart/icon-heavy pages.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    remotePatterns: [
      // Allow S3/CloudFront-hosted assets once storage is wired up.
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
  },
};

export default nextConfig;
