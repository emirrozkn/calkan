const userMessages = new Map();

const SPAM_THRESHOLD = 5; 
const SPAM_WINDOW = 5000;
const MUTE_DURATION = 10 * 60 * 1000;

async function checkSpam(message) {
    if (message.member.id === message.guild.ownerId) return false;
    const userId = message.author.id;
    const now = Date.now();

    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    const timestamps = userMessages.get(userId);
    const recent = timestamps.filter(t => now - t < SPAM_WINDOW);
    recent.push(now);
    userMessages.set(userId, recent);

    if (recent.length >= SPAM_THRESHOLD) {
        await message.member.timeout(MUTE_DURATION, 'Spamming').catch(() => {});
        await message.delete().catch(() => {});
        return true;
    }
    
    return false;
}

module.exports = { checkSpam };