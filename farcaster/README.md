# Farcaster Mentions Monitor

A simple JavaScript script to monitor Farcaster for mentions of your username (@aaronegeorge) and display them in the console.

## 🚀 Quick Setup

### Prerequisites
- Node.js installed on your computer
- Internet connection
- A Neynar API key (free)

### Installation

1. **Get a FREE Neynar API Key:**
   - Go to [https://neynar.com](https://neynar.com)
   - Sign up for a free account
   - Go to your dashboard and create an API key
   - Copy the API key

2. **Update the script with your API key:**
   - Open `index.js`
   - Replace `'DEMO_API_KEY'` with your actual Neynar API key:
   ```javascript
   const NEYNAR_API_KEY = 'your_actual_api_key_here';
   ```

3. **Navigate to the farcaster directory:**
   ```bash
   cd farcaster
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Run the monitor:**
   ```bash
   npm start
   ```

That's it! The script will start monitoring and display any mentions in your console.

## 🔧 How It Works

- **Uses Neynar API** - Reliable and fast Farcaster API service
- **No Farcaster keys required!** - Just a free Neynar API key
- Checks for mentions every 30 seconds
- Only shows new mentions (avoids duplicates)
- Displays the full text, author, timestamp, and cast hash
- Shows reaction counts (likes, recasts)

## 📋 Configuration Options

You can customize the following in `index.js`:

```javascript
const USERNAME = 'aaronegeorge';        // Your Farcaster username
const NEYNAR_API_KEY = 'your_key_here'; // Your Neynar API key
const CHECK_INTERVAL = 30000;           // Check every 30 seconds (30000ms)
```

## 🛠️ What You'll See

When someone mentions you, you'll see output like this:

```
🎉 Found 1 new mention(s)!

📝 Mention 1:
   👤 From: @friendusername (Friend Name)
   💬 Text: "Hey @aaronegeorge, check this out!"
   🕐 Time: 2024-01-15T14:30:00.000Z
   🔗 Hash: 0x1234567890abcdef...
   📊 Reactions: 5 likes, 2 recasts
   ────────────────────────────────────────
```

## 🆓 Neynar API Limits

The free Neynar plan includes:
- 200K compute units per month
- Read APIs (perfect for monitoring mentions)
- No credit card required

This is more than enough for personal mention monitoring!

## 🔐 Security Note

- Keep your Neynar API key private
- Don't commit it to public repositories
- Consider using environment variables for production use

## 🛑 Stopping the Monitor

To stop the monitor, press `Ctrl + C` in your terminal.

## 🆘 Troubleshooting

**401 Authentication Error:**
- Check that your Neynar API key is correct
- Make sure you haven't exceeded your API limits

**Username not found:**
- Verify your Farcaster username is correct
- Make sure it's the username, not display name

**Network errors:**
- Check your internet connection
- Neynar API is much more reliable than direct hub access

## 📚 Resources

- [Neynar Documentation](https://docs.neynar.com/)
- [Farcaster Protocol](https://www.farcaster.xyz/)
- [Get a Neynar API Key](https://neynar.com/)

---

Happy monitoring! 🎉 