import type { Metadata } from "next";
import "./globals.css";
import "./life-maxim.css";
import "./product-polish.css";
import { BuiltWithFooter } from "@/components/built-with-footer";

export const metadata: Metadata = {
  title: "Life Maxim — Your AI Life Manager",
  description: "Bring your goals, evidence, decisions, and next steps together in one personal workspace.",
  icons: {
    icon: "/life-maxim-icon.svg",
    shortcut: "/life-maxim-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className="antialiased">{children}<BuiltWithFooter/></body>
    </html>
  );
}
