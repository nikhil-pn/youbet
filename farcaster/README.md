# Farcaster Mention Bot

A simple JavaScript bot that listens to Farcaster mentions using the Neynar API.

## Features

- 🔍 Polls for mentions every 30 seconds
- 📢 Detects new mentions in real-time
- 💬 Extracts mention details (author, text, timestamp, etc.)
- 🤖 Customizable response handling
- 🛑 Graceful shutdown handling

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Neynar API key
- Farcaster account for your bot

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `env.example` to `.env`
   - Fill in your actual values:
   ```bash
   cp env.example .env
   ```

3. **Configure your `.env` file:**
   ```env
   NEYNAR_API_KEY=your_neynar_api_key_here
   BOT_USERNAME=your_bot_username
   BOT_MNEMONIC=your_bot_mnemonic_phrase_here
   ```

### Getting Your Credentials

1. **Neynar API Key:**
   - Visit [neynar.com](https://neynar.com/)
   - Sign up and get your API key
   - Add it to your `.env` file

2. **Bot Username:**
   - Your Farcaster username (without the @)

3. **Bot Mnemonic:**
   - Your Farcaster account's recovery phrase
   - ⚠️ Keep this secure and never share it

## Usage

### Start the bot:
```bash
npm start
```

### Development mode (auto-restart on changes):
```bash
npm run dev
```

## How It Works

1. **Polling:** The bot checks for new mentions every 30 seconds
2. **Detection:** It fetches mention notifications using the Neynar API
3. **Processing:** Each new mention is processed and logged
4. **Response:** You can customize the `onMentionReceived` method to handle mentions

## Customization

### Handling Mentions

Edit the `onMentionReceived` method in `index.js` to customize what happens when someone mentions your bot:

```javascript
async onMentionReceived(mentionData) {
  // Your custom logic here
  console.log('New mention from:', mentionData.authorUsername);
  console.log('Message:', mentionData.text);
  
  // Add your response logic
  if (mentionData.text.includes('hello')) {
    // Handle hello messages
  }
}
```

### Replying to Mentions

To enable automatic replies, you'll need to set up proper authentication and signing. The current implementation shows where to add reply functionality.

## Mention Data Structure

Each mention contains:
- `castHash`: Unique identifier for the cast
- `authorUsername`: Username of who mentioned you
- `authorFid`: Farcaster ID of the author
- `text`: The text content of the mention
- `timestamp`: When the mention occurred
- `parentCastHash`: If it's a reply, the parent cast hash

## Security Notes

- Never commit your `.env` file to version control
- Keep your mnemonic phrase secure
- Use environment variables for all sensitive data
- Consider using a dedicated bot account

## Troubleshooting

### Common Issues

1. **"NEYNAR_API_KEY is required" error:**
   - Make sure your `.env` file exists and contains your API key

2. **"Error getting bot FID" error:**
   - Check that your bot username is correct
   - Ensure the username exists on Farcaster

3. **No mentions detected:**
   - Verify your bot has been mentioned recently
   - Check that the API key has proper permissions

### Logs

The bot provides detailed logging:
- 🤖 Bot startup
- 🔍 Mention checking
- 📢 New mentions found
- 📭 No new mentions
- ❌ Errors

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT 