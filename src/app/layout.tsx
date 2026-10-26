import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NativeApp } from "@/components/native-app";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
  display: "swap",
});

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
    { media: "(prefers-color-scheme: light)", color: "#EFEEE9" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F0E" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={instrumentSans.variable} suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body className="min-h-dvh bg-background text-text font-sans antialiased">
        <NativeApp />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
