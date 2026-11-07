import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg (node-postgres) stays out of the client bundle — server only.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
