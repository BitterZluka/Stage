import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Creator Platform",
  description: "Community credits, challenges, and tokenized claims on Hedera",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
