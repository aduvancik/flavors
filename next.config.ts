import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // <- це вимикає ESLint під час білду
  },
};

export default nextConfig;
