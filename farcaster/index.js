const axios = require('axios');

// Configuration
const USERNAME = 'aaronegeorge'; // Your username
const NEYNAR_API_KEY = 'E489382E-30CD-44DC-B53F-FAAE1EF6C04D'; // Replace with your actual Neynar API key
const CHECK_INTERVAL = 30000; // Check every 30 seconds

// Store last seen cast timestamp to avoid duplicates
let lastSeenTimestamp = Date.now();

async function getFidByUsername(username) {
    try {
        const response = await axios.get(`https://api.neynar.com/v1/farcaster/user-by-username?username=${username}`, {
            headers: {
                'accept': 'application/json',
                'api_key': NEYNAR_API_KEY
            }
        });
        
        if (response.data && response.data.result && response.data.result.user) {
            return response.data.result.user.fid;
        }
        return null;
    } catch (error) {
        console.error('❌ Error getting FID for username:', error.message);
        return null;
    }
}

async function searchMentions() {
    try {
        console.log(`🔍 Checking for mentions of @${USERNAME}...`);
        
        // Get your FID first
        const fid = await getFidByUsername(USERNAME);
        if (!fid) {
            console.error('❌ Could not find FID for username:', USERNAME);
            return;
        }
        
        console.log(`👤 Your FID: ${fid}`);
        
        // Search for mentions using Neynar API
        const response = await axios.get('https://api.neynar.com/v2/farcaster/feed', {
            headers: {
                'accept': 'application/json',
                'api_key': NEYNAR_API_KEY
            },
            params: {
                feed_type: 'filter',
                filter_type: 'fids',
                fids: fid.toString(),
                limit: 10
            }
        });

        if (response.data && response.data.casts) {
            const newMentions = response.data.casts.filter(cast => {
                const castTime = new Date(cast.timestamp).getTime();
                const mentionsYou = cast.text.includes(`@${USERNAME}`) || 
                                 (cast.mentioned_profiles && cast.mentioned_profiles.some(profile => profile.fid === fid));
                
                return castTime > lastSeenTimestamp && mentionsYou;
            });

            if (newMentions.length > 0) {
                console.log(`\n🎉 Found ${newMentions.length} new mention(s)!\n`);
                
                newMentions.forEach((cast, index) => {
                    console.log(`📝 Mention ${index + 1}:`);
                    console.log(`   👤 From: @${cast.author.username} (${cast.author.display_name})`);
                    console.log(`   💬 Text: "${cast.text}"`);
                    console.log(`   🕐 Time: ${cast.timestamp}`);
                    console.log(`   🔗 Hash: ${cast.hash}`);
                    console.log(`   📊 Reactions: ${cast.reactions.likes_count} likes, ${cast.reactions.recasts_count} recasts`);
                    console.log(`   ────────────────────────────────────────\n`);
                });

                // Update last seen timestamp
                const latestTimestamp = Math.max(...newMentions.map(cast => new Date(cast.timestamp).getTime()));
                lastSeenTimestamp = latestTimestamp;
            } else {
                console.log('✨ No new mentions found');
            }
        } else {
            console.log('📭 No casts found in response');
        }

    } catch (error) {
        console.error('❌ Error searching for mentions:', error.message);
        if (error.response && error.response.status === 401) {
            console.error('🔑 Authentication failed. Please check your NEYNAR_API_KEY');
        }
    }
}

async function startMonitoring() {
    console.log('🚀 Starting Farcaster mentions monitor...');
    console.log(`👀 Watching for mentions of @${USERNAME}`);
    console.log(`⏰ Checking every ${CHECK_INTERVAL / 1000} seconds`);
    console.log('════════════════════════════════════════\n');

    // Initial check
    await searchMentions();

    // Set up interval for periodic checks
    setInterval(searchMentions, CHECK_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping mentions monitor... Goodbye!');
    process.exit(0);
});

// Start the monitor
startMonitoring();
