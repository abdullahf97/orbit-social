import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Orbit — a quieter social network",
    template: "%s · Orbit",
  },
  description:
    "A small, offline-first social app: infinite feed, optimistic interactions, image sharing and notifications. Built with Next.js, TypeScript and PostgreSQL.",
  applicationName: "Orbit",
  openGraph: {
    type: "website",
    title: "Orbit — a quieter social network",
    description:
      "An offline-first social feed built with Next.js, TypeScript and PostgreSQL.",
    siteName: "Orbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbit — a quieter social network",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("orbit-theme");
    var theme = stored || "dark";
    if (theme === "light") document.documentElement.classList.add("light");
  } catch (error) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${instrument.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
