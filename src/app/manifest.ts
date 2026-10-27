import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Max",
    short_name: "Max",
    start_url: "/events",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F4F4",
    theme_color: "#0C1014",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
