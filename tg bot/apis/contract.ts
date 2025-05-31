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

async function voteOnBet(betId: string, option: number, privateKey: string) {
  try {
    const wallet1 = new ethers.Wallet(privateKey, provider); // wallet of /bet caller
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet1);

    // Get bet details to know the required amount
    const betDetails = await getBetDetails(betId, privateKey);
    const betAmount = betDetails.betAmount;

    const tx = await contract.vote(betId, option, {
      value: betAmount
    });
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log(`Vote cast successfully! Block: ${receipt.blockNumber}`);
    return receipt;
  } catch (error) {
    console.error("Error voting:", error.message);
    throw error;
  }
}

async function getBetDetails(betId: string, privateKey: string) {
  try {
    const wallet1 = new ethers.Wallet(privateKey, provider); // wallet of /bet caller
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet1);
    const result = await contract.getBet(betId);

    const betDetails = {
      moderator: result[0],
      betAmount: result[1],
      totalPool: result[2],
      yesCount: result[3],
      noCount: result[4],
      isResolved: result[5]
    };

    console.log(`Bet Details for ${betId}:`);
    console.log(`  Moderator: ${betDetails.moderator}`);
    console.log(`  Bet Amount: ${fromWei(betDetails.betAmount)} ETH`);
    console.log(`  Total Pool: ${fromWei(betDetails.totalPool)} ETH`);
    console.log(`  Yes Votes: ${betDetails.yesCount}`);
    console.log(`  No Votes: ${betDetails.noCount}`);
    console.log(`  Is Resolved: ${betDetails.isResolved}`);

    return betDetails;
  } catch (error) {
    console.error("Error getting bet details:", error.message);
    throw error;
  }
}

export { createBet, voteOnBet, getBetDetails };
