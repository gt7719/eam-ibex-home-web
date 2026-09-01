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
      <body className="antialiased"><script dangerouslySetInnerHTML={{__html:`(()=>{const apply=(detail)=>{try{const lang=detail?.lang==='en'||detail?.lang==='mn'?detail.lang:(localStorage.getItem('ibex-lang')==='en'?'en':'mn');const day=typeof detail?.day==='boolean'?detail.day:localStorage.getItem('ibex-theme')==='day';document.documentElement.dataset.ibexTheme=day?'day':'night';document.documentElement.lang=lang;if(detail){localStorage.setItem('ibex-lang',lang);localStorage.setItem('ibex-theme',day?'day':'night')}}catch{}};apply();addEventListener('storage',()=>apply());addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='ibex-global-appearance')apply(event.data)})})()`}} />{children}</body>
    </html>
  );
}
