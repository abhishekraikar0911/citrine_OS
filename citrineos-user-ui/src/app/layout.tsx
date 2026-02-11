import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EV Charging Control",
  description: "Simple EV charging start/stop interface",
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
