import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getLocale } from "@/i18n";
import { dirFor } from "@/i18n/config";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "DineFlow — نظام تشغيل المطاعم",
    template: "%s · DineFlow",
  },
  description:
    "منصة متكاملة لإدارة المطاعم: منيو رقمي، طلبات فورية، طاولات وأكواد QR، شاشة مطبخ، موظفون، تقارير وذكاء اصطناعي.",
  applicationName: "DineFlow",
  keywords: ["restaurant", "menu", "QR menu", "POS", "kitchen display", "مطاعم", "منيو رقمي", "نظام مطاعم"],
  authors: [{ name: "DineFlow" }],
  openGraph: {
    type: "website",
    siteName: "DineFlow",
    title: "DineFlow — نظام تشغيل المطاعم",
    description: "منيو رقمي، طلبات فورية، شاشة مطبخ، تقارير وذكاء اصطناعي في نظام واحد.",
  },
  twitter: { card: "summary_large_image", title: "DineFlow", description: "Restaurant Operating System" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b101b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = dirFor(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
