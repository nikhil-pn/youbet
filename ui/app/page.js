import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="w-full p-6 flex justify-between items-center">
        <img src="/youbet.png" alt="YouBet" className="w-20 h-20" />
        <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow">
          Connect Wallet
        </button>
      </nav>

      {/* Main Content */}
      <div className="flex justify-center items-center min-h-[calc(100vh-120px)] px-4 -mt-10">
        <div className="text-center">
          <h2 className="text-7xl font-bold text-gray-800 mb-12 handwritten">
            BET ON ANYTHING
          </h2>

          <div className="flex justify-center gap-4">
            <button className="bg-green-200 hover:bg-green-300 text-gray-800 font-semibold py-2 px-6 border border-gray-400 rounded-md">
              Discover Bets
            </button>
            <button className="bg-green-200 hover:bg-green-300 text-gray-800 font-semibold py-2 px-6 border border-gray-400 rounded-md">
              Create Bet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
