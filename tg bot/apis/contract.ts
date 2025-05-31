const { ethers } = require('ethers');

// Contract ABI
const CONTRACT_ABI = [
  "function betmake(string memory betId, address mod, uint256 betAmount) external",
  "function vote(string memory betId, int8 option) external payable",
  "function release(string memory betId, int8 winOption) external",
  "function getBet(string memory betId) external view returns (address moderator, uint256 betAmount, uint256 totalPool, uint256 yesCount, uint256 noCount, bool isResolved)",
  "function hasVoted(string, address) external view returns (bool)"
];


// Configuration
const CONTRACT_ADDRESS = "0xAabDD138bdF948A281c7007cfBb16c4198D1E3ff"; // Replace with deployed contract address
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Ga1VL8EhvMVle7_yFbZZ4CgTEVCrBSpS"; // Replace with your RPC URL


// Create provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Utility function to convert ETH to Wei
function toWei(ethAmount) {
  return ethers.parseEther(ethAmount.toString());
}

// Utility function to convert Wei to ETH
function fromWei(weiAmount) {
  return ethers.formatEther(weiAmount);
}

/**
 * Create a new bet
 */
async function createBet(
  betId: string,
  moderatorAddress: string,
  betAmountEth: string | number,
  privateKey: string
): Promise<any> {
  try {
    const wallet1 = new ethers.Wallet(privateKey, provider); // wallet of /bet caller
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet1);
    console.log(`Creating bet: ${betId}`);
    const betAmountWei = toWei(betAmountEth);

    const tx = await contract.betmake(betId, moderatorAddress, betAmountWei);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log(`Bet created successfully! Block: ${receipt.blockNumber}`);
    return receipt;
  } catch (error) {
    console.error("Error creating bet:", error.message);
    throw error;
  }
}

export { createBet };
