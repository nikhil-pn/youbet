import { Context } from "grammy";

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
      const moderator = modLine.substring(4).trim();
      const creator = ctx.from?.username || ctx.from?.first_name || 'Anonymous';

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
          is_anonymous: false, // Changed to false so we can track voters
          type: "regular",
          allows_multiple_answers: false,
          // Optional: Set a close date (e.g., 24 hours from now)
          // close_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        }
      );

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

      // Trigger the appropriate function based on the vote
      if (voteChoice === 'Yes') {
        await this.handleYesVote(voteData, ctx);
      } else {
        await this.handleNoVote(voteData, ctx);
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
      await ctx.reply("❌ Error retrieving detailed results");
    }
  }

  // Close poll manually (only by moderator or creator)
  async closePoll(ctx: Context, pollId?: string) {
    try {
      // If no pollId provided, try to extract from reply
      let targetPollId = pollId;

      if (!targetPollId && ctx.message?.reply_to_message?.poll) {
        targetPollId = ctx.message.reply_to_message.poll.id;
      }

      if (!targetPollId) {
        return ctx.reply("❌ Please reply to a poll message to close it, or provide poll ID");
      }

      const pollData = activePools.get(targetPollId);

      if (!pollData) {
        return ctx.reply("❌ Poll not found or already closed");
      }

      // Check if user is authorized to close the poll
      const userMention = `@${ctx.from?.username}`;
      const isCreator = ctx.from?.username === pollData.creator;
      const isModerator = userMention === pollData.moderator;
      const isAdmin = ctx.from?.username === 'admin'; // Add your admin check logic

      if (!isCreator && !isModerator && !isAdmin) {
        return ctx.reply("❌ Only the poll creator, moderator, or admin can close this poll");
      }

      // Stop the poll
      await ctx.api.stopPoll(pollData.chatId, pollData.messageId);

      // Get final vote counts
      const votes = pollVotes.get(targetPollId) || [];
      const yesCount = votes.filter(v => v.vote === 'Yes').length;
      const noCount = votes.filter(v => v.vote === 'No').length;

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
      console.error('Error closing poll:', error);
      await ctx.reply("❌ Error closing poll");
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

// Usage example in your main bot file:
/*
import { Bot } from "grammy";
import { NativeBettingPoll } from "./betting-poll";

const bot = new Bot("YOUR_BOT_TOKEN");
const bettingPoll = new NativeBettingPoll();

// Command handlers
bot.command("bet", (ctx) => bettingPoll.createBetPoll(ctx));
bot.command("closepoll", (ctx) => bettingPoll.closePoll(ctx));
bot.command("pollresults", (ctx) => bettingPoll.getPollResults(ctx));
bot.command("detailedresults", (ctx) => bettingPoll.getDetailedResults(ctx));
bot.command("activepolls", (ctx) => bettingPoll.listActivePolls(ctx));

// Handle poll answers - THIS IS WHERE THE MAGIC HAPPENS
bot.on("poll_answer", (ctx) => bettingPoll.handlePollAnswer(ctx));

bot.start();
*/
