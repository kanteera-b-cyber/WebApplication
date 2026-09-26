import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeOps | Alarm & Maintenance",
  description: "Factory automation operations dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/*
          Apply the stored theme before the first paint. Without this the page
          renders in light mode first and then flips, which is visible as a
          flash on every navigation.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("forgeops-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
