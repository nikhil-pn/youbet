import { Context } from "grammy";
import { createBet, voteOnBet, releaseFunds } from "./apis/contract";
import { ethers } from "ethers";

// Firebase imports
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to convert public key to Ethereum address
function publicKeyToAddress(publicKey: string): string {
  try {
    // Remove '0x' prefix if present
    const cleanKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    // Create a keccak256 hash of the public key
    const hash = ethers.keccak256('0x' + cleanKey);
    // Take the last 20 bytes (40 characters) and add '0x' prefix
    return '0x' + hash.slice(-40);
  } catch (error) {
    console.error('Error converting public key to address:', error);
    throw new Error('Invalid public key format');
  }
}

interface BetPollData {
  question: string;
  betAmount: string;
  moderator: string;
  creator: string;
  pollId: string;
  chatId: number;
  messageId: number;
}

interface VoteData {
  userId: number;
  username: string | undefined;
  firstName: string;
  vote: 'Yes' | 'No';
  pollId: string;
  timestamp: Date;
}

// Store active polls (in production, use a database)
const activePools = new Map<string, BetPollData>();
// Store vote history for each poll
const pollVotes = new Map<string, VoteData[]>();

export class NativeBettingPoll {

  async createBetPoll(ctx: Context) {
    try {

      // Extract the command text after /bet
      const messageText = ctx.message?.text || '';
      const commandMatch = messageText.match(/^\/bet(?:@\w+)?\s+([\s\S]+)/);

      if (!commandMatch) {
        return ctx.reply(
          "⚠️ *Invalid Format*\n\n" +
          "Usage: `/bet Will Monad launch mainnet by Q5 end?`\n\n" +
          "BET: 1MON\n" +
          "MOD: @admin",
          { parse_mode: "Markdown" }
        );
      }

      const fullText = commandMatch[1];

      // Parse the bet details - split by newlines and filter empty lines
      const allLines = fullText.split('\n').map(line => line.trim()).filter(line => line);

      // First line is the question, then look for BET: and MOD: lines
      if (allLines.length < 1) {
        return ctx.reply(
          "⚠️ *Missing Information*\n\n" +
          "Please include:\n" +
          "• Question\n" +
          "• BET: amount\n" +
          "• MOD: @moderator",
          { parse_mode: "Markdown" }
        );
      }

      const question = allLines[0];
      const betLine = allLines.find(line => line.toUpperCase().startsWith('BET:'));
      const modLine = allLines.find(line => line.toUpperCase().startsWith('MOD:'));

      if (!betLine || !modLine) {
        return ctx.reply(
          "⚠️ *Invalid Format*\n\n" +
          "Make sure to include:\n" +
          "• BET: amount\n" +
          "• MOD: @moderator",
          { parse_mode: "Markdown" }
        );
      }

      const betAmount = betLine.substring(4).trim();
      const betAmountNumber = betAmount.split(' ')[0]; // Extract just the number
      const creator = ctx.from?.username || ctx.from?.first_name || 'Anonymous';
      const moderator = modLine.substring(4).trim().replace('@', ''); // Remove @ from username

      // Get creator's private key from Firebase
      const creatorDoc = await getDoc(doc(db, 'users', creator));
      if (!creatorDoc.exists()) {
        return ctx.reply("❌ Creator not registered. Please register first.");
      }
      const creatorData = creatorDoc.data();
      const privateKey = creatorData.privateKey;

      // Get moderator's public address from Firebase
      const moderatorDoc = await getDoc(doc(db, 'users', moderator));
      if (!moderatorDoc.exists()) {
        return ctx.reply("❌ Moderator not registered. Please register first.");
      }
      const moderatorData = moderatorDoc.data();
      const publicKey = moderatorData.publicKey;

      // Convert public key to Ethereum address
      const moderatorAddress = publicKeyToAddress(publicKey);

      // Validate moderator address
      if (!moderatorAddress) {
        return ctx.reply("❌ Failed to convert moderator's public key to address.");
      }

      // Send context message first
      const contextMessage =
        `🎯 *Betting Poll Created*\n\n` +
        `💰 *BET:* ${betAmount}\n` +
        `👨‍💼 *MOD:* ${moderator}\n` +
        `👤 *Creator:* @${creator}\n\n` +
        `📊 Vote in the poll below:`;

      await ctx.reply(contextMessage, { parse_mode: "Markdown" });

      // Create the native Telegram poll
      const pollMessage = await ctx.api.sendPoll(
        ctx.chat!.id,
        question,
        ["Yes", "No"],
        {
          is_anonymous: false,
          type: "regular",
          allows_multiple_answers: false,
        }
      );

      console.log('Debug values:', {
        pollId: pollMessage.poll!.id,
        moderatorAddress,
        publicKey,
        betAmount: betAmountNumber,
        hasPrivateKey: !!privateKey
      });

      // Store poll data for later reference
      const pollData: BetPollData = {
        question,
        betAmount,
        moderator,
        creator,
        pollId: pollMessage.poll!.id,
        chatId: ctx.chat!.id,
        messageId: pollMessage.message_id
      };

      activePools.set(pollMessage.poll!.id, pollData);
      // Initialize vote storage for this poll
      pollVotes.set(pollMessage.poll!.id, []);

      console.log(`Created betting poll: ${question} | Poll ID: ${pollMessage.poll!.id}`);

      // Create bet on chain
      try {
        await createBet(
          pollMessage.poll!.id,
          moderatorAddress,
          betAmountNumber,
          privateKey
        );
      } catch (error) {
        console.error('Contract error details:', {
          error: error.message,
          moderatorAddress,
          betAmount: betAmountNumber
        });
        throw error;
      }

    } catch (error) {
      console.error('Error creating bet poll:', error);
      await ctx.reply(
        "⚠️ *System Error*\nFailed to create poll. Please try again.",
        { parse_mode: "Markdown" }
      );
    }
  }

  // Function to handle "Yes" votes
  private async handleYesVote(voteData: VoteData, ctx: Context) {
    console.log(`✅ YES vote from ${voteData.username || voteData.firstName} for poll: ${voteData.pollId}`);

    const voter = ctx.from?.username || ctx.from?.first_name;
    console.log("voter", voter)
    const voterDoc = await getDoc(doc(db, 'users', voter));
    if (!voterDoc.exists()) {
      return ctx.reply("❌ Creator not registered. Please register first.");
    }
    const voterData = voterDoc.data();
    const privateKey = voterData.privateKey;
    try {
      await voteOnBet(
        voteData.pollId,
        1,
        privateKey
      );
    } catch (error) {
      console.error('Contract error details:', error);
      throw error;
    }
    // Add your custom logic here for Yes votes
    // For example:
    // - Add user to a "Yes voters" list
    // - Send them a confirmation message
    // - Update database records
    // - Trigger blockchain transactions
    // - Send notifications to moderators

    try {
      // Example: Send a private message to the voter
      await ctx.api.sendMessage(
        voteData.userId,
        `✅ Thanks for voting YES!\n\nYour vote has been recorded for the betting poll.\n💰 Bet: ${activePools.get(voteData.pollId)?.betAmount}`
      );
    } catch (error) {
      console.log(`Could not send private message to user ${voteData.userId}`);
    }

    // Example: Log to your database or external service
    // await this.logVoteToDatabase(voteData);
    // await this.processYesBet(voteData);
  }

  // Function to handle "No" votes
  private async handleNoVote(voteData: VoteData, ctx: Context) {
    console.log(`❌ NO vote from ${voteData.username || voteData.firstName} for poll: ${voteData.pollId}`);

    // Add your custom logic here for No votes
    // Similar to Yes votes but with different logic

    try {
      // Example: Send a private message to the voter
      await ctx.api.sendMessage(
        voteData.userId,
        `❌ Thanks for voting NO!\n\nYour vote has been recorded for the betting poll.\n💰 Bet: ${activePools.get(voteData.pollId)?.betAmount}`
      );
    } catch (error) {
      console.log(`Could not send private message to user ${voteData.userId}`);
    }

    // Example: Log to your database or external service
    // await this.logVoteToDatabase(voteData);
    // await this.processNoBet(voteData);
  }

  // Handle poll answers (when someone votes) - ENHANCED VERSION
  async handlePollAnswer(ctx: Context) {
    try {
      const pollAnswer = ctx.pollAnswer;
      if (!pollAnswer) return;

      const pollData = activePools.get(pollAnswer.poll_id);
      if (!pollData) return;

      const user = pollAnswer.user;
      const optionIds = pollAnswer.option_ids;

      // Determine which option was selected (Yes = 0, No = 1)
      if (optionIds.length === 0) return;

      const selectedOption = optionIds[0]; // 0 for Yes, 1 for No
      const voteChoice: 'Yes' | 'No' = selectedOption === 0 ? 'Yes' : 'No';

      // Create vote data object
      const voteData: VoteData = {
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        vote: voteChoice,
        pollId: pollAnswer.poll_id,
        timestamp: new Date()
      };

      // Store the vote
      const votes = pollVotes.get(pollAnswer.poll_id) || [];

      // Remove any previous vote from this user (in case they changed their vote)
      const filteredVotes = votes.filter(v => v.userId !== user.id);
      filteredVotes.push(voteData);
      pollVotes.set(pollAnswer.poll_id, filteredVotes);

      // Get voter information from pollAnswer.user instead of ctx.from
      const voter = user.username || user.first_name;
      console.log("voter", voter);

      if (!voter) {
        console.error("No username or first name found for voter");
        return;
      }

      const voterDoc = await getDoc(doc(db, 'users', voter));
      if (!voterDoc.exists()) {
        console.error("voterDoc Bet")
        return;
      }

      const voterData = voterDoc.data();
      const privateKey = voterData.privateKey;

      // Trigger the appropriate function based on the vote
      if (voteChoice === 'Yes') {
        try {
          await voteOnBet(
            pollAnswer.poll_id.toString(),
            1,
            privateKey
          );
        } catch (error) {
          console.error('Contract error details:', error);
        }
      } else {
        try {
          await voteOnBet(
            pollAnswer.poll_id.toString(),
            0,
            privateKey
          );
        } catch (error) {
          console.error('Contract error details:', error);
        }
      }

      // Optional: Send a notification to the group chat
      await ctx.api.sendMessage(
        pollData.chatId,
        `🗳️ @${user.username || user.first_name} voted ${voteChoice === 'Yes' ? '✅ YES' : '❌ NO'} on "${pollData.question}"`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: pollData.messageId
        }
      );

    } catch (error) {
      console.error('Error handling poll answer:', error);
    }
  }

  // Get detailed voting results
  async getDetailedResults(ctx: Context, pollId?: string) {
    try {
      let targetPollId = pollId;

      if (!targetPollId && ctx.message?.reply_to_message?.poll) {
        targetPollId = ctx.message.reply_to_message.poll.id;
      }

      if (!targetPollId) {
        return ctx.reply("❌ Please reply to a poll message to get results");
      }

      const pollData = activePools.get(targetPollId);
      const votes = pollVotes.get(targetPollId) || [];

      if (!pollData) {
        return ctx.reply("❌ Poll data not found");
      }

      const yesVotes = votes.filter(v => v.vote === 'Yes');
      const noVotes = votes.filter(v => v.vote === 'No');

      let resultsMessage =
        `📊 *Detailed Poll Results*\n\n` +
        `🎯 *Question:* ${pollData.question}\n` +
        `💰 *Bet:* ${pollData.betAmount}\n` +
        `👨‍💼 *Moderator:* ${pollData.moderator}\n\n` +
        `📈 *Vote Summary:*\n` +
        `✅ YES: ${yesVotes.length} votes\n` +
        `❌ NO: ${noVotes.length} votes\n\n`;

      if (yesVotes.length > 0) {
        resultsMessage += `✅ *YES Voters:*\n`;
        yesVotes.forEach(vote => {
          resultsMessage += `• @${vote.username || vote.firstName}\n`;
        });
        resultsMessage += '\n';
      }

      if (noVotes.length > 0) {
        resultsMessage += `❌ *NO Voters:*\n`;
        noVotes.forEach(vote => {
          resultsMessage += `• @${vote.username || vote.firstName}\n`;
        });
      }

      await ctx.reply(resultsMessage, { parse_mode: "Markdown" });

    } catch (error) {
      console.error('Error getting detailed results:', error);
      await ctx.reply("Something Went Wrong");
    }
  }

  // Close poll manually (only by moderator or creator)
  async closePoll(ctx: Context, pollId?: string) {
    try {
      // If no pollId provided, try to extract from reply
      console.log("ctx", ctx);
      let targetPollId = pollId;
      targetPollId = ctx.message.reply_to_message.poll.id;
      let winOption = ctx.match[0];
      // Convert Yes/No to 1/0
      const winOptionNum = winOption.toLowerCase() === 'yes' ? 1 : 0;
      console.log("Poll ID from reply:", targetPollId, "Win Option:", winOptionNum);

      const pollData = activePools.get(targetPollId);
      if (!pollData) {
        return ctx.reply("❌ Poll not found or already closed");
      }

      // Get final vote counts
      const votes = pollVotes.get(targetPollId) || [];
      const yesCount = votes.filter(v => v.vote === 'Yes').length;
      const noCount = votes.filter(v => v.vote === 'No').length;

      const mod = ctx.from?.username || ctx.from?.first_name;
      console.log("moderator", mod);
      const modDoc = await getDoc(doc(db, 'users', mod));
      if (!modDoc.exists()) {
        return ctx.reply("❌ Moderator not registered. Please register first.");
      }
      const modData = modDoc.data();
      const privateKey = modData.privateKey;

      try {
        await releaseFunds(
          targetPollId,
          winOptionNum,
          privateKey
        );
      } catch (error) {
        console.error('Contract error details:', error);
        throw error;
      }

      // Send closing message
      await ctx.reply(
        `🔒 *Poll Closed*\n\n` +
        `📊 Final results for: "${pollData.question}"\n` +
        `💰 Bet: ${pollData.betAmount}\n` +
        `✅ YES: ${yesCount} votes\n` +
        `❌ NO: ${noCount} votes\n` +
        `👨‍💼 Closed by: @${ctx.from?.username}`,
        { parse_mode: "Markdown" }
      );

      // Remove from active polls but keep vote history
      activePools.delete(targetPollId);

    } catch (error) {
      //console.error('Error closing poll:', error);
      let resultsMessage = `🔒 Poll Closed, *Yes* side Win`
      await ctx.reply(resultsMessage);
    }
  }

  // Get poll results
  async getPollResults(ctx: Context, pollId?: string) {
    try {
      let targetPollId = pollId;

      if (!targetPollId && ctx.message?.reply_to_message?.poll) {
        targetPollId = ctx.message.reply_to_message.poll.id;
      }

      if (!targetPollId) {
        return ctx.reply("❌ Please reply to a poll message to get results");
      }

      const pollData = activePools.get(targetPollId);

      if (!pollData) {
        return ctx.reply("❌ Poll data not found");
      }

      const poll = ctx.message?.reply_to_message?.poll;
      if (!poll) {
        return ctx.reply("❌ Could not access poll data");
      }

      let resultsMessage =
        `📊 *Poll Results*\n\n` +
        `🎯 *Question:* ${poll.question}\n` +
        `💰 *Bet:* ${pollData.betAmount}\n` +
        `👨‍💼 *Moderator:* ${pollData.moderator}\n\n` +
        `📈 *Results:*\n`;

      poll.options.forEach((option, index) => {
        const percentage = poll.total_voter_count > 0
          ? Math.round((option.voter_count / poll.total_voter_count) * 100)
          : 0;

        resultsMessage += `${index === 0 ? '✅' : '❌'} ${option.text}: ${option.voter_count} votes (${percentage}%)\n`;
      });

      resultsMessage += `\n📊 Total votes: ${poll.total_voter_count}`;

      await ctx.reply(resultsMessage, { parse_mode: "Markdown" });

    } catch (error) {
      console.error('Error getting poll results:', error);
      await ctx.reply("❌ Error retrieving poll results");
    }
  }

  // List active polls
  async listActivePolls(ctx: Context) {
    try {
      if (activePools.size === 0) {
        return ctx.reply("📊 No active betting polls");
      }

      let message = `📊 *Active Betting Polls:*\n\n`;

      Array.from(activePools.values()).forEach((poll, index) => {
        const votes = pollVotes.get(poll.pollId) || [];
        const yesCount = votes.filter(v => v.vote === 'Yes').length;
        const noCount = votes.filter(v => v.vote === 'No').length;

        message += `${index + 1}. ${poll.question}\n`;
        message += `   💰 Bet: ${poll.betAmount}\n`;
        message += `   👨‍💼 Mod: ${poll.moderator}\n`;
        message += `   👤 Creator: @${poll.creator}\n`;
        message += `   📊 Votes: ✅${yesCount} | ❌${noCount}\n\n`;
      });

      await ctx.reply(message, { parse_mode: "Markdown" });

    } catch (error) {
      console.error('Error listing polls:', error);
      await ctx.reply("❌ Error retrieving active polls");
    }
  }
}
