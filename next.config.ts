import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg (node-postgres) stays out of the client bundle — server only.
  serverExternalPackages: ["pg"],
  // No version banner for scanners.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS only. No includeSubDomains: vivereply.com hosts
          // sibling services whose TLS we do not control here.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          // Never let the app (or its approve buttons) be framed.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // The app needs none of these — deny them all.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
