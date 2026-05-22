import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import "@/app/globals.css";

const manrope = Manrope({
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "AI Knowledge Assistant",
  description: "Full-stack knowledge assistant starter built with Next.js and FastAPI."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
