"use client";

import { Honk as FrijoleFont } from "next/font/google";
import { sdk } from "@farcaster/frame-sdk";
import { useState, useEffect } from "react";

import Image from "next/image";
import NextButton from "./NextButton";

const Frijole = FrijoleFont({
  variable: "--font-frijole",
  weight: "400",
  subsets: ["latin"],
});

export default function Home() {
  useEffect(() => {
    // Call ready when the interface is ready to be displayed
    sdk.actions.ready();
  }, []);

  return (
    <div
      className={`min-h-screen bg-gray-500 bg-[url('/bg.jpg')] bg-cover bg-center ${Frijole.variable}`}
    >
      {/* Navigation Bar */}
      <nav className="w-full p-4 sm:p-6 flex justify-between items-center">
        <img
          src="/youbetpng.png"
          alt="YouBet"
          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white rounded-full p-2"
        />
        <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-3 sm:px-4 text-sm sm:text-base border border-gray-400 rounded shadow">
          Connect Wallet
        </button>
      </nav>

      {/* Main Content */}
      <div className="flex justify-center items-center min-h-[calc(100vh-100px)] sm:min-h-[calc(100vh-120px)] px-4 -mt-4 sm:-mt-10">
        <div className="text-center">
          <h2
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-amber-300 mb-6 sm:mb-8 md:mb-12 handwritten animate-bounce leading-tight"
            style={{ fontFamily: "var(--font-frijole), cursive" }}
          >
            BET ON ANYTHING
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
         
            <NextButton />
          </div>
        </div>
      </div>
    </div>
  );
}
