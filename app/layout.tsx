import type { Metadata } from "next";
import "./globals.css";
import "./post-v30-admin.css";

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
      <body className="antialiased"><script dangerouslySetInnerHTML={{__html:`(()=>{try{const apply=()=>{document.documentElement.dataset.ibexTheme=localStorage.getItem('ibex-theme')==='day'?'day':'night';document.documentElement.lang=localStorage.getItem('ibex-lang')==='en'?'en':'mn'};apply();addEventListener('storage',apply)}catch{}})()`}} />{children}</body>
    </html>
  );
}
