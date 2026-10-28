import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenro Ask AI - Shadithya Hospital Payroll",
  description: "Enterprise AI Payroll and HRMS Assistant for Zenro & Shadithya Hospital with live database execution",
  icons: {
    icon: "/zenrofavicon.png",
    shortcut: "/zenrofavicon.png",
    apple: "/zenrofavicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/zenrofavicon.png" type="image/png" />
        <link rel="shortcut icon" href="/zenrofavicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/zenrofavicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
