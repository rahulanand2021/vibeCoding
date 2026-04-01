import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Kanban Flow",
  description: "A minimal, polished Kanban board MVP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="appBody">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
