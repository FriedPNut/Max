import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  /**
   * The service worker is served no-cache so Chrome always revalidates it and
   * picks up a new version, and with the JavaScript content type the worker
   * spec requires. No caching is added anywhere else.
   */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
