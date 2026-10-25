import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep a visited tab in the client router cache so going back shows the
    // last data immediately instead of refetching from zero.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
