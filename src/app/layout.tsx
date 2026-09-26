import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeOps | Alarm & Maintenance",
  description: "Factory automation operations dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body className="bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
