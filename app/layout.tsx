import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0f19",
};

export const metadata: Metadata = {
  title: "QuickPOS - ระบบขายหน้าร้าน",
  description: "ระบบขายหน้าร้าน QuickPOS รวดเร็ว สะดวก ง่ายต่อการใช้งาน",
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      url: '/logo_quickpos.png',
    },
    {
      rel: 'apple-touch-icon',
      type: 'image/png',
      url: '/logo_quickpos.png',
    }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" sizes="32x32" />
        <link rel="icon" href="/favicon.png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/logo_quickpos.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
