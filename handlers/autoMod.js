const { log } = require('../utils/logger');
const { dmUser } = require('../utils/dm');

const userMessages = new Map();
const userViolations = new Map();

function getViolations(userId) {
  const data = userViolations.get(userId);
  if (!data) return 0;
  if (Date.now() - data.lastViolation > 24 * 60 * 60 * 60 * 1000) {
    userViolations.delete(userId);
    return 0;
  }
  return data.count;
}

function addViolation(userId) {
  const current = getViolations(userId);
  userViolations.set(userId, {
    count: current + 1,
    lastViolation: Date.now()
  });
  return current + 1;
}

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
        if (recent.length > SPAM_THRESHOLD) return true;
        const violations = addViolation(message.author.id);

        // Harsher punishment for repeat offenders
        let muteDuration = MUTE_DURATION;
        let muteText = '10minutes';

        if (violations === 2) {
            muteDuration = 30 * 60 * 1000;
            muteText = '30 minutes';
        } else if (violations === 3) {
            muteDuration = 60 * 60 * 1000;
            muteText = '1 hour';
        }else if (violations >= 4) {
            muteDuration = 24 * 60 * 60 * 1000;
            muteText = '24 hours';
        }

        await message.member.timeout(muteDuration, 'Spamming').catch(() => {});
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Spamming messages', '10 minute timeout');

        await log(message.client, 'spam', {
            color: 'red',
            title: '🔇 Spam Detected',
            description: `A user was timed out for spamming.`,
            fields: [
                { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
                {name: '⏱️ Duration', value: '10 minutes', inline: true },
                { name: '💬 Messages', value: `${recent.length} in 5 seconds`, inline: true },
                { name: '⚠️ Violation', value: `#${violations}`, inline: true },
            ]
        });

        return true;
    }
    
    return false;
}

module.exports = { checkSpam };