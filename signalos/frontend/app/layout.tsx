import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalOS",
  description: "Real-time AI monitoring layer for 911 on-hold calls",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
