const { log } = require('../utils/logger');
const { dmUser } = require('../utils/dm');

const fetch = require('node-fetch');

// Load phishing domains list on startup
let phishingDomains = [];

async function loadPhishingList() {
    try {
        const res = await fetch('https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/domain-list.json');
        const data = await res.json();
        phishingDomains = data.domains;
        console.log(`✅ Loaded ${phishingDomains.length} phishing domains`);
    } catch (err) {
      console.error('[Phishing] Failed to load phishing list', err.message);
    }
}

loadPhishingList();
// Refresh every 24 hours
setInterval(loadPhishingList, 24* 60 * 60 * 1000);

const userMessages = new Map();
const userViolations = new Map();

function getViolations(userId) {
  const data = userViolations.get(userId);
  if (!data) return 0;
  if (Date.now() - data.lastViolation > 24 * 60 * 60 * 1000) {
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

const MUTE_DURATION = 10 * 60 * 1000;

async function checkSpam(message, config) {
    if (message.member.id === message.guild.ownerId) return false;
    const userId = message.author.id;
    const now = Date.now();

    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    const timestamps = userMessages.get(userId);
    const recent = timestamps.filter(t => now - t < config.autoMod.spam.window);
    recent.push(now);
    userMessages.set(userId, recent);

    if (recent.length >= config.autoMod.spam.threshold) {
        if (recent.length > config.autoMod.spam.threshold) return true;
        const violations = addViolation(message.author.id);

        // Harsher punishment for repeat offenders
        let muteDuration = MUTE_DURATION;
        let muteText = '10 minutes';

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
        await dmUser(message.member, 'Spamming messages', `${muteText} timeout`);

        await log(message.client, 'spam', {
            color: 'red',
            title: '🔇 Spam Detected',
            description: `A user was timed out for spamming.`,
            fields: [
                { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
                {name: '⏱️ Duration', value: muteText, inline: true },
                { name: '💬 Messages', value: `${recent.length} in ${config.autoMod.spam.window / 1000} seconds`, inline: true },
                { name: '⚠️ Violation', value: `#${violations}`, inline: true },
            ]
        });

        return true;
    }
    
    return false;
}

async function checkInvites(message, config) {
    if (!config.autoMod.invites.enabled) return false;

    const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;

    if (inviteRegex.test(message.content)) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Posting Discord invite links', 'Message deleted');
        await log(message.client, 'mod', {
            color: 'orange',
            title: '🔗 Invite Link Blocked',
            description: 'A user posted an unauthorized Discord invite link.',
            fields: [
                { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: '⚠️ Violation', value: `#${violations}`, inline: true },
            ]
        });
        return true;
    }
    return false;
}

async function checkLinks(message, config) {
    if (!config.autoMod.links.enabled) return false;

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.content.match(urlRegex);
    if (!urls) return false;

    const isAllowed = urls.every(url => {
        return config.autoMod.links.allowedDomains.some(domain => url.toLowerCase().includes(domain));
    });

    if (!isAllowed) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Posting unauthorized links', 'Message deleted');
        await log(message.client, 'mod', {
            color: 'orange',
            title: '🌐 Unauthorized Link Blocked',
            description: 'A user posted an unauthorized link.',
            fields: [
                { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: '⚠️ Violation', value: `#${violations}`, inline: true },
            ]
        });
        return true;
    }
    return false;
}

async function checkPhishing(message, config) {
    if (!config.autoMod.phishing.enabled) return false;
    
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.content.match(urlRegex);
    if (!urls) return false;

    const isPhishing = urls.some(url => {
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return phishingDomains.includes(domains);
        } catch {
          return false;
        }
    });
    
    if (isPhishing) {
        const violations = addViolation(message.author.id);
        await message.member.timeout(24 * 60 * 60 * 1000, 'Phishing link').catch(() => {});
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Posting phishing/scam links', '24 hour timeout');
        await log(message.client, 'mod', {
            color: 'red',
            title: '🎣 Phishing link Detected',
            description: 'A user posted a known phishing/scam link. They have been timed out for 24 hours.',
            fields: [
                { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: '⏱️ Timeout', value: '24 hours', inline: true },
                { name: '⚠️ Violation', value: `#${violations}`, inline: true }
            ]
        });
        return true;
    }
    return false;
}

async function checkBannedWords(message, config) {
    if (!config.autoMod.bannedWords.enabled) return false;
    if (config.autoMod.bannedWords.words.length === 0) return false;

    const content = message.content.toLowerCase();
    const found = config.autoMod.bannedWords.words.find(word => content.includes(word.toLowerCse()));

    if (found) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Using probhited language', 'Message deleted');
        await log(message.client, 'mod', {
            color: 'orange',
            title: '🚫 Banned Word Detected',
            description: 'A user used a probhitted word or phrase.',
            fields: [
                { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
                { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: '⚠️ Violation', value: `#${violations}`, inline: true },
            ]
        });
        return true;
    }
    return false;
}

async function checkCaps(message, config) {
    if (!config.autoMod.caps.enabled) return false;
    if (message.content.length < config.autoMod.caps.minLength) return false;

    const letters = message.content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return false;

    const upperCount = letters.replace(/[^A-Z]/g, '').length;
    const capsPercent = (upperCount / letters.length) * 100;

    if (capsPercent >= config.autoMod.caps.percentage) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Excessive use of caps', 'Message deleted');
        await log(message.client, 'mod', {
        color: 'orange',
        title: '🔠 Caps Abuse Detected',
        description: 'A user sent a message with excessive capitals.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '📊 Caps', value: `${Math.round(capsPercent)}%`, inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

async function checkEmoji(message, config) {
    if (!config.autoMod.emoji.enabled) return false;

    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:[a-zA-Z0-9_]+:\d+>)/gu;
    const emojis = message.content.match(emojiRegex) || [];

    if (emojis.length > config.autoMod.emoji.max) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Excessive emoji spam', 'Message deleted');
        await log(message.client, 'mod', {
        color: 'orange',
        title: '😵 Emoji Spam Detected',
        description: 'A user sent a message with excessive emojis.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '😵 Emojis', value: `${emojis.length}`, inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

async function checkMentions(message, config) {
    if (!config.autoMod.mentions.enabled) return false;

    const totalMentions = message.mentions.users.size + message.mentions.roles.size;

    if (totalMentions > config.autoMod.mentions.max) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Mention spam', 'Message deleted');
        await log(message.client, 'mod', {
        color: 'orange',
        title: '📣 Mention Spam Detected',
        description: 'A user sent a message with excessive mentions.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '📣 Mentions', value: `${totalMentions}`, inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

const userLastMessages = new Map();

async function checkDuplicates(message, config) {
    if (!config.autoMod.duplicates.enabled) return false;

    const userId = message.author.id;
    const content = message.content.toLowerCase().trim();
    const now = Date.now();

    if (!userLastMessages.has(userId)) {
        userLastMessages.set(userId, []);
    }

    const history = userLastMessages.get(userId);
    const recent = history.filter(m => now - m.time < config.autoMod.duplicates.window);
    recent.push({ content, time: now });
    userLastMessages.set(userId, recent);

    const duplicates = recent.filter(m => m.content === content);

    if (duplicates.length >= config.autoMod.duplicates.threshold) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Sending duplicate messages', 'Message deleted');
        await log(message.client, 'mod', {
        color: 'orange',
        title: '🔁 Duplicate Messages Detected',
        description: 'A user sent the same message multiple times.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '🔁 Count', value: `${duplicates.length}x`, inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

async function checkZalgo(message, config) {
    if (!config.autoMod.zalgo.enabled) return false;

    // Zalgo text contains excessive combining unicode characters
    const zalgoRegex = /[\u0300-\u036f\u0489\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{3,}/g;

    if (zalgoRegex.test(message.content)) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Zalgo/corrupted text', 'Message deleted');
        await log(message.client, 'mod', {
        color: 'orange',
        title: '👾 Zalgo Text Detected',
        description: 'A user sent a message containing zalgo/corrupted text.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

async function checkCharRepeat(message, config) {
    if (!config.autoMod.characterRepeat.enabled) return false;

    const repeatRegex = /(.)\1{9,}/g;

    if (repeatRegex.test(message.content)) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Character repetition spam', 'Message deleted');
        await log(message.client, 'mod', {
        color: 'orange',
        title: '🔤 Character Repetition Detected',
        description: 'A user sent a message with excessive repeated characters.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

async function checkPersonalInfo(message, config) {
    if (!config.autoMod.personalInfo.enabled) return false;

    const patterns = [
        // Phone numbers
        /(\+?[\d\s\-\(\)]{10,15})/g,
        // Email addresses
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        // IP addresses
        /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        // Credit cards
        /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
    ];

    const found = patterns.some(pattern => pattern.test(message.content));

    if (found) {
        const violations = addViolation(message.author.id);
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Sharing personal/sensitive information', 'Message deleted');
        await log(message.client, 'mod', {
        color: 'red',
        title: '📱 Personal Info Detected',
        description: 'A user posted a message containing personal or sensitive information.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

async function checkMassMention(message, config) {
    if (!config.autoMod.massMention.enabled) return false;

    if (message.mentions.everyone) {
        const violations = addViolation(message.author.id);
        await message.member.timeout(60 * 60 * 1000, 'Mass mention attempt').catch(() => {});
        await message.delete().catch(() => {});
        await dmUser(message.member, 'Attempting to mass mention (@everyone/@here)', '1 hour timeout');
        await log(message.client, 'mod', {
        color: 'red',
        title: '📢 Mass Mention Attempt',
        description: 'A user attempted to use @everyone or @here.',
        fields: [
            { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
            { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '⏱️ Timeout', value: '1 hour', inline: true },
            { name: '⚠️ Violation', value: `#${violations}`, inline: true },
        ]
        });
        return true;
    }
    return false;
}

module.exports = { checkSpam, checkInvites, checkLinks, checkPhishing, checkBannedWords, checkCaps, checkEmoji, checkMentions, checkDuplicates, checkZalgo, checkCharRepeat, checkPersonalInfo, checkMassMention };