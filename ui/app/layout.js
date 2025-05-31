import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const frameEmbed = {
  version: "next",
  imageUrl: "https://www.youbet.fun/youbet.png",
  button: {
    title: "Open YouBet",
    action: {
      type: "launch_frame",
      name: "YouBet",
    },
  },
};

export const metadata = {
  title: "YouBet",
  description:
    "Bet on anything - Discover and create bets in a decentralized betting platform",
  metadataBase: new URL("https://www.youbet.fun"),
  openGraph: {
    title: "YouBet",
    description: "Bet on anything",
    images: ["https://www.youbet.fun/youbet.png"],
  },
  other: {
    "fc:frame": JSON.stringify(frameEmbed),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
