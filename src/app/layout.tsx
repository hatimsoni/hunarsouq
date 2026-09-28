import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
import { Navbar, Footer } from "@/components/site-shell";
import "./globals.css";

const geistSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Lora({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Hunar Souq — Good people. Beautiful skills.",
    template: "%s | Hunar Souq",
  },
  description:
    "A community built on skill and trust. Discover local talent, support independent businesses, and find your next hunar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="fixed -top-20 left-4 z-50 rounded-md bg-primary p-3 text-white focus:top-4"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
