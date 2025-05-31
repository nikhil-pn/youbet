require('dotenv').config();
const { NeynarAPIClient } = require('@neynar/nodejs-sdk');

// Initialize Neynar client
const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

// Bot configuration
const BOT_USERNAME = process.env.BOT_USERNAME;
const BOT_MNEMONIC = process.env.BOT_MNEMONIC;

class FarcasterMentionBot {
  constructor() {
    this.client = client;
    this.lastProcessedTime = new Date();
    this.isRunning = false;
  }

  async start() {
    console.log(`🤖 Starting Farcaster mention bot for @${BOT_USERNAME}`);
    
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY is required. Please set it in your .env file');
    }

    if (!BOT_USERNAME) {
      throw new Error('BOT_USERNAME is required. Please set it in your .env file');
    }

    this.isRunning = true;
    await this.startListening();
  }

  async startListening() {
    console.log('🔍 Starting to listen for mentions...');
    
    // Poll for mentions every 30 seconds
    setInterval(async () => {
      if (this.isRunning) {
        await this.checkForMentions();
      }
    }, 30000);

    // Initial check
    await this.checkForMentions();
  }

  async checkForMentions() {
    try {
      console.log('🔍 Checking for new mentions...');
      
      // Get mentions using Neynar API
      const response = await this.client.fetchMentionAndReplyNotifications({
        fid: await this.getBotFid(),
        limit: 50
      });

      if (response?.notifications && response.notifications.length > 0) {
        const newMentions = response.notifications.filter(notification => {
          const mentionTime = new Date(notification.most_recent_timestamp);
          return mentionTime > this.lastProcessedTime;
        });

        if (newMentions.length > 0) {
          console.log(`📢 Found ${newMentions.length} new mention(s)!`);
          
          for (const mention of newMentions) {
            await this.handleMention(mention);
          }
          
          this.lastProcessedTime = new Date();
        } else {
          console.log('📭 No new mentions found');
        }
      }
    } catch (error) {
      console.error('❌ Error checking for mentions:', error.message);
    }
  }

  async getBotFid() {
    try {
      // Get bot's FID using username
      const userResponse = await this.client.lookupUserByUsername(BOT_USERNAME);
      return userResponse.result.user.fid;
    } catch (error) {
      console.error('❌ Error getting bot FID:', error.message);
      throw error;
    }
  }

  async handleMention(mention) {
    try {
      console.log('📝 Processing mention:', {
        from: mention.cast?.author?.username || 'unknown',
        text: mention.cast?.text || 'no text',
        hash: mention.cast?.hash || 'no hash'
      });

      // Extract mention details
      const mentionData = {
        castHash: mention.cast?.hash,
        authorUsername: mention.cast?.author?.username,
        authorFid: mention.cast?.author?.fid,
        text: mention.cast?.text,
        timestamp: mention.most_recent_timestamp,
        parentCastHash: mention.cast?.parent_hash
      };

      // Call your custom mention handler
      await this.onMentionReceived(mentionData);

    } catch (error) {
      console.error('❌ Error handling mention:', error.message);
    }
  }

  async onMentionReceived(mentionData) {
    // This is where you can customize what happens when someone mentions your bot
    console.log('🎯 New mention received!');
    console.log('👤 From:', mentionData.authorUsername);
    console.log('💬 Text:', mentionData.text);
    console.log('🔗 Cast Hash:', mentionData.castHash);
    console.log('⏰ Timestamp:', new Date(mentionData.timestamp));
    
    // Example: Reply to the mention
    await this.replyToMention(mentionData);
  }

  async replyToMention(mentionData) {
    try {
      // Example auto-reply
      const replyText = `Hello @${mentionData.authorUsername}! Thanks for mentioning me! 👋`;
      
      console.log('💬 Attempting to reply:', replyText);
      
      // Note: To actually post replies, you'll need to implement cast publishing
      // This requires additional setup with a signer and proper authentication
      // For now, we'll just log what we would reply
      
      console.log('✅ Reply would be sent:', replyText);
      
      // Uncomment and implement this when you have proper signing setup:
      /*
      const replyResponse = await this.client.publishCast({
        text: replyText,
        parent: mentionData.castHash
      });
      console.log('✅ Reply sent successfully:', replyResponse);
      */
      
    } catch (error) {
      console.error('❌ Error replying to mention:', error.message);
    }
  }

  stop() {
    console.log('🛑 Stopping Farcaster mention bot...');
    this.isRunning = false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  if (bot) {
    bot.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  if (bot) {
    bot.stop();
  }
  process.exit(0);
});

// Initialize and start the bot
let bot;

async function main() {
  try {
    bot = new FarcasterMentionBot();
    await bot.start();
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Start the bot
main().catch(console.error);
