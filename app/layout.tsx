import type { Metadata } from "next";
import "./globals.css";
import "./life-maxim.css";
import "./product-polish.css";
import "./emerald-theme.css";
import { BuiltWithFooter } from "@/components/built-with-footer";
import { LifeThemeProvider } from "@/components/theme-control";

export const metadata: Metadata = {
  title: "Life Maxim — Your AI Life Manager",
  description: "Bring your goals, evidence, decisions, and next steps together in one personal workspace.",
  icons: {
    icon: "/life-maxim-logo.png",
    shortcut: "/life-maxim-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><LifeThemeProvider>{children}<BuiltWithFooter/></LifeThemeProvider></body>
    </html>
  );
}
