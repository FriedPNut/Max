import type { MetadataRoute } from "next";

/**
 * Everything Chrome for Android needs to mint a real WebAPK instead of a
 * browser shortcut: an id, a same-origin scope that covers every route, the
 * two required icon sizes plus a maskable one, and the dark theme colours.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Max",
    short_name: "Max",
    description: "Maximum potential, maximum fun, maximum productivity.",
    start_url: "/events",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "en",
    background_color: "#0C1014",
    theme_color: "#0C1014",
    categories: ["social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Full-bleed artwork, logo inside the center 80% safe zone.
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
