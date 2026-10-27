import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NativeApp } from "@/components/native-app";
import { SessionGuard } from "@/components/session-guard";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max",
  description: "Maximum potential, maximum fun, maximum productivity.",
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
      </head>
      <body className="min-h-dvh bg-background text-text font-sans antialiased">
        <NativeApp />
        <SessionGuard />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
