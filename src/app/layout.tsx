import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NativeApp } from "@/components/native-app";
import { SessionGuard } from "@/components/session-guard";
import { RootShell } from "@/components/shell/root-shell";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { BUBBLE_COLOR_SCRIPT } from "@/lib/bubble-colors";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max",
  description: "Maximum potential, maximum fun, maximum productivity.",
  applicationName: "Max",
  // Next writes the mobile-web-app-capable and apple-mobile-web-app tags from
  // this; iOS reads them when Max is added to the home screen. The status bar
  // is translucent because the layout already pads by the safe area.
  appleWebApp: {
    capable: true,
    title: "Max",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F4F4" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1014" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: BUBBLE_COLOR_SCRIPT }}
        />
      </head>
      <body className="min-h-dvh bg-background text-text font-sans antialiased">
        <NativeApp />
        <SessionGuard />
        <ThemeProvider>
          {/* The one app frame: scroller, root header and the only tab bar. */}
          <RootShell>{children}</RootShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
