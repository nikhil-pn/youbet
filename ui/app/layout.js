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
  version: "1",
  imageUrl: "https://www.youbet.fun/youbet.png",
  button: {
    title: "Open YouBet",
    action: {
      type: "launch_frame",
      name: "YouBet",
      url: "https://www.youbet.fun",
      splashImageUrl: "https://www.youbet.fun/youbet.png",
      splashBackgroundColor: "#ffffff",
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
      <head>
        <meta name="fc:frame" content={JSON.stringify(frameEmbed)} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
