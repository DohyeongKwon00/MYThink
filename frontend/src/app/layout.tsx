import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MYT",
  description: "MYT application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
