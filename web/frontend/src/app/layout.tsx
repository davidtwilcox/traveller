import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Traveller Dice",
  description: "Dice roller for the Traveller TTRPG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
