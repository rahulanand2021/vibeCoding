import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanban MVP",
  description: "Minimalist Kanban Board MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
