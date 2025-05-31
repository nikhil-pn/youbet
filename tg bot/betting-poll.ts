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

// Store active polls (in production, use a database)
const activePools = new Map<string, BetPollData>();

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
          is_anonymous: true,
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

      console.log(`Created betting poll: ${question} | Poll ID: ${pollMessage.poll!.id}`);

    } catch (error) {
      console.error('Error creating bet poll:', error);
      await ctx.reply(
        "⚠️ *System Error*\nFailed to create poll. Please try again.",
        { parse_mode: "Markdown" }
      );
    }
  }

  // Handle poll answers (when someone votes)
  async handlePollAnswer(ctx: Context) {
    try {
      const pollAnswer = ctx.pollAnswer;
      if (!pollAnswer) return;

      const pollData = activePools.get(pollAnswer.poll_id);
      if (!pollData) return;

      const user = pollAnswer.user;
      const optionIds = pollAnswer.option_ids;

      console.log(`Poll vote: User ${user.username || user.first_name} voted option ${optionIds} in poll ${pollAnswer.poll_id}`);

      // You can add additional logic here, like tracking votes, notifications, etc.

    } catch (error) {
      console.error('Error handling poll answer:', error);
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

      // Send closing message
      await ctx.reply(
        `🔒 *Poll Closed*\n\n` +
        `📊 Final results for: "${pollData.question}"\n` +
        `💰 Bet: ${pollData.betAmount}\n` +
        `👨‍💼 Closed by: @${ctx.from?.username}`,
        { parse_mode: "Markdown" }
      );

      // Remove from active polls
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
        message += `${index + 1}. ${poll.question}\n`;
        message += `   💰 Bet: ${poll.betAmount}\n`;
        message += `   👨‍💼 Mod: ${poll.moderator}\n`;
        message += `   👤 Creator: @${poll.creator}\n\n`;
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
bot.command("activepolls", (ctx) => bettingPoll.listActivePolls(ctx));

// Handle poll answers
bot.on("poll_answer", (ctx) => bettingPoll.handlePollAnswer(ctx));

bot.start();
*/
