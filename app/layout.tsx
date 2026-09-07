import type { Metadata, Viewport } from "next";
import { Anton, Chivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Chivo({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Courtside — Live 3D Badminton Arena",
  description:
    "A real-time 3D badminton show court with PBR surfaces streamed live from Poly Haven and the upcoming BWF World Tour fixture list.",
  openGraph: {
    title: "Courtside — Live 3D Badminton Arena",
    description: "Regulation 3D show court, live-streamed textures, and the upcoming BWF World Tour calendar.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04060b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
