import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Farmer Connect",
  description: "A connected farming community for Zimbabwe.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
