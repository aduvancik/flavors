import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "@/context/LoadingContext";
import PageTransition from "@/components/PageTransition/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "accouting",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="bg-white text-black">
        <LoadingProvider>
          {/* <LoadingSpinner /> */}
          <PageTransition>
            {children}
          </PageTransition>
        </LoadingProvider>
      </body>
    </html>
  );
}
