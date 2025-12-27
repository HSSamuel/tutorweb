import type { Metadata } from "next";
// 👇 1. Import the new font
import { Outfit } from "next/font/google";
import "./globals.css";

// 👇 2. Configure it
const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "AI Tutor NG",
  description: "Hyper-local AI education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning={true}
        // 👇 3. Apply the class name here
        className={`${outfit.className} antialiased bg-[#0f172a] text-slate-200`}
      >
        {children}
      </body>
    </html>
  );
}
