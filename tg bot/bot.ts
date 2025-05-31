import { Bot, GrammyError, HttpError, Context, InputMediaBuilder } from "grammy";
import "dotenv/config";
import { NativeBettingPoll } from "./betting-poll";
import { ethers } from "ethers";

// Firebase imports
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// // Firebase configuration
// const firebaseConfig = {
//
// };
//
// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// Monad RPC endpoint
const MONAD_RPC_URL = "https://testnet-rpc.monad.xyz";

// State to track if the user is expected to send a wallet address

// Function to create ETH wallet
function createAccountETH() {
  const wallet = ethers.Wallet.createRandom();
  const privateKey = wallet.privateKey;
  const publicKey = wallet.publicKey;
  const address = wallet.address;
  const mnemonicKey = wallet.mnemonic?.phrase || '';

  return { privateKey, publicKey, address, mnemonicKey };
}

// Function to get balance from Monad RPC
async function getMonadBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw new Error('Failed to fetch balance');
  }
}

// Function to check if message is from DM
function isDM(ctx: Context): boolean {
  return ctx.chat?.type === 'private';
}

// Function to check if message is from group
function isGroup(ctx: Context): boolean {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
}

export function startBot() {
  const token = process.env.BOT_API_KEY;
  const bot = new Bot(token);
  const bettingPoll = new NativeBettingPoll();

  // Define command handlers in one central object
  const commandHandlers = {

    // New commands
    async help(ctx: any) {
      const message = `🌌 <b>YouBet Commands</b> 🌌\n\n` +
        `🏠 <b>Main Commands</b>\n` +
        `<blockquote expandable>` +
        `/help - Show this help menu\n` +
        `/start - Create your wallet (DM only)\n` +
        `</blockquote>\n\n` +

        `💰 <b>Wallet Management (DM Only)</b>\n` +
        `<blockquote expandable>` +
        `/balance - Check your balance\n` +
        `</blockquote>\n\n` +

        `🎯 <b>Betting & Polls (Groups Only)</b>\n` +
        `<blockquote expandable>` +
        `/poll - Create betting poll\n` +
        `/closepoll - Close active poll\n` +
        `/results - View poll results\n` +
        `/activepolls - List active polls\n` +
        `</blockquote>\n\n` +

        `<b>⚠️ System Status: ONLINE</b>\n` +
        `<b>🔋 Power Level: 100%</b>\n` +
        `<b>🌐 Network: Monad Testnet</b>`;
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_parameters: { message_id: ctx.msg.message_id },
      });
    },
  };

  // /start command - Create wallet (DM only)
  bot.command("start", async (ctx) => {
    // Check if it's a DM
    if (!isDM(ctx)) {
      return ctx.reply("🔒 Wallet creation is only available in direct messages for security reasons. Please DM me to create your wallet.");
    }

    try {
      const username = ctx.from?.username;
      if (!username) {
        return ctx.reply("❌ Please set a Telegram username first to use this service.");
      }

      // Check if user already has a wallet
      const userDoc = await getDoc(doc(db, "users", username));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const balance = await getMonadBalance(userData.address);

        return ctx.reply(
          `🎯 <b>Welcome back!</b>\n\n` +
          `📱 <b>Username:</b> @${username}\n` +
          `💳 <b>Address:</b> <code>${userData.address}</code>\n` +
          `💰 <b>Balance:</b> ${balance} MON\n\n` +
          `⚠️ <i>Your wallet already exists. Use /balance to check current balance.</i>`,
          { parse_mode: "HTML" }
        );
      }

      // Create new wallet
      const { privateKey, publicKey, address, mnemonicKey } = createAccountETH();

      // Store in Firebase
      await setDoc(doc(db, "users", username), {
        username,
        privateKey,
        publicKey,
        address,
        mnemonicKey,
        createdAt: new Date().toISOString()
      });

      // Get initial balance
      const balance = await getMonadBalance(address);

      const welcomeMessage =
        `🎉 <b>Welcome to YouBet!</b>\n\n` +
        `✅ <b>Wallet Created Successfully</b>\n\n` +
        `📱 <b>Username:</b> @${username}\n` +
        `💳 <b>Address:</b> <code>${address}</code>\n` +
        `🔐 <b>Private Key:</b> <code>${privateKey}</code>\n` +
        `🔑 <b>Public Key:</b> <code>${publicKey}</code>\n` +
        `💰 <b>Balance:</b> ${balance} MON\n\n` +
        `⚠️ <b>IMPORTANT SECURITY NOTICE:</b>\n` +
        `<i>• Keep your private key safe and secret\n` +
        `• Never share it with anyone\n` +
        `• We recommend saving it securely offline\n` +
        `• This message will be deleted for security</i>\n\n` +
        `🚀 <b>Next Steps:</b>\n` +
        `• Use /balance to check your balance anytime\n` +
        `• Join groups to participate in betting polls\n` +
        `• Fund your wallet to start betting!`;

      const sentMessage = await ctx.reply(welcomeMessage, { parse_mode: "HTML" });

      // Delete the message after 60 seconds for security
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, sentMessage.message_id);
          await ctx.reply("🔒 Wallet details have been automatically deleted for security. Use /balance to check your current balance.");
        } catch (error) {
          console.error('Error deleting message:', error);
        }
      }, 60000);

    } catch (error) {
      console.error('Error creating wallet:', error);
      await ctx.reply("❌ Error creating wallet. Please try again later.");
    }
  });

  // /balance command - Check balance (DM only)
  bot.command("balance", async (ctx) => {
    // Check if it's a DM
    if (!isDM(ctx)) {
      return ctx.reply("🔒 Balance check is only available in direct messages for security reasons. Please DM me to check your balance.");
    }

    try {
      const username = ctx.from?.username;
      if (!username) {
        return ctx.reply("❌ Please set a Telegram username first to use this service.");
      }

      // Get user data from Firebase
      const userDoc = await getDoc(doc(db, "users", username));
      if (!userDoc.exists()) {
        return ctx.reply("❌ Wallet not found. Use /start to create your wallet first.");
      }

      const userData = userDoc.data();
      const balance = await getMonadBalance(userData.address);

      const balanceMessage =
        `💰 <b>Your Wallet Balance</b>\n\n` +
        `📱 <b>Username:</b> @${username}\n` +
        `💳 <b>Address:</b> <code>${userData.address}</code>\n` +
        `💰 <b>Current Balance:</b> ${balance} MON\n\n` +
        `🔗 <b>Network:</b> Monad Testnet\n` +
        `⏰ <b>Last Updated:</b> ${new Date().toLocaleString()}`;

      await ctx.reply(balanceMessage, { parse_mode: "HTML" });

    } catch (error) {
      console.error('Error fetching balance:', error);
      await ctx.reply("❌ Error fetching balance. Please try again later.");
    }
  });

  // Modified betting commands to only work in groups
  bot.command("bet", (ctx) => {
    if (!isGroup(ctx)) {
      return ctx.reply("🎯 Betting polls can only be created in groups. Please use this command in a group chat.");
    }
    return bettingPoll.createBetPoll(ctx);
  });

  bot.command("closepoll", (ctx) => {
    if (!isGroup(ctx)) {
      return ctx.reply("🎯 Poll management is only available in groups. Please use this command in a group chat.");
    }
    return bettingPoll.closePoll(ctx);
  });

  bot.command("pollresults", (ctx) => {
    if (!isGroup(ctx)) {
      return ctx.reply("🎯 Poll results can only be viewed in groups. Please use this command in a group chat.");
    }
    return bettingPoll.getPollResults(ctx);
  });

  bot.command("activepolls", (ctx) => {
    if (!isGroup(ctx)) {
      return ctx.reply("🎯 Active polls can only be viewed in groups. Please use this command in a group chat.");
    }
    return bettingPoll.listActivePolls(ctx);
  });

  bot.on("poll_answer", (ctx) => bettingPoll.handlePollAnswer(ctx));

  // Setup callback query handlers for inline buttons
  Object.keys(commandHandlers).forEach(command => {
    // Register callback query handlers
    bot.callbackQuery(command, async (ctx) => {
      await ctx.answerCallbackQuery(); // Answer callback to remove loading state
      return commandHandlers[command](ctx);
    });

    // Register command handlers (/command)
    bot.command(command, (ctx) => commandHandlers[command](ctx));
  });

  // Handle poll answers
  //bot.on("poll_answer", (ctx) => bettingPoll.handlePollAnswer(ctx));

  // Error handling
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });

  // Start the bot
  bot.start();

  return {
    bot,
    stop: () => bot.stop()
  };
}
