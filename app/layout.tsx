import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eAM iBeX — Хөрөнгө төвтэй нэгдсэн удирдлага",
  description:
    "Хөрөнгө, ажил, засвар, нөөц, зардал болон бодит өгөгдлийг нэг цөмд холбосон Монгол EAM/CMMS платформ.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body className="antialiased">{children}</body>
    </html>
  );
}
