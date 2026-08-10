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
  // Don't advertise the framework to scanners.
  poweredByHeader: false,
  /**
   * Security headers. This app serves patient medical records, so the
   * defaults are not good enough.
   *
   * CSP note: Next injects inline bootstrap scripts and styles, so a strict
   * nonce-based policy needs middleware plumbing. `frame-ancestors 'none'`
   * (clickjacking) and the transport headers are the ones that actually
   * matter here, and they are exact — the script/style rules stay permissive
   * rather than shipping a policy that breaks the app.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // data: covers the base64 uploads (bill photos, signatures, documents).
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // Two years, preloadable — stops the first-request downgrade attack.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Patient data must never be cached by an intermediary.
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
