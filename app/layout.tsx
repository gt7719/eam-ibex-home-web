import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"eAM iBeX",description:"Хөрөнгийн удирдлага, засвар үйлчилгээний нэгдсэн ухаалаг платформ."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="mn"><body>{children}</body></html>}
