import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider, SessionTimeoutProvider } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PunchCard - Time Tracking",
  description: "Time tracking application for architectural consultants",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <AuthProvider>
          <SessionTimeoutProvider>
            {children}
          </SessionTimeoutProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
