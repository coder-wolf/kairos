import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Serif, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kairos-app.live";
const description =
  "Kairos is a personal productivity workspace for time tracking, time-based goals, habits, and calm analytics.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Kairos — Time well spent",
    template: "%s · Kairos",
  },
  description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Kairos",
    title: "Kairos — Time well spent",
    description,
    images: [
      {
        url: "/og-kairos.png",
        type: "image/png",
        width: 1200,
        height: 630,
        alt: "Kairos dashboard showing time tracked, goals, and projects",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kairos — Time well spent",
    description,
    images: [
      {
        url: "/og-kairos.png",
        width: 1200,
        height: 630,
        alt: "Kairos dashboard showing time tracked, goals, and projects",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d10" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get("kairos_theme")?.value;
  const theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={`${manrope.variable} ${instrumentSerif.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-bg text-text antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
