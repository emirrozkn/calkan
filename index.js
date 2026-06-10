require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { checkSpam, checkInvites, checkLinks, checkPhishing, checkBannedWords, checkCaps, checkEmoji, checkMentions, checkDuplicates, checkZalgo, checkCharRepeat, checkPersonalInfo, checkMassMention } = require('./handlers/autoMod');
const config = require('./config');

const dmCooldown = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.on('clientReady', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    logChannel.send({
        embeds: [{
            color: 0xFFD700,
            author: { name: 'Calkan Security', iconURL: client.user.displayAvatarURL() },
            title: '🟢 Calkan is Online',
            description: 'All systems active and protecting the server.',
            fields: [
                { name: '🛡️ Auto-Mod', value: '12 filters active', inline: true },
                { name: '🎣 Phishing DB', value: '21,908 domains', inline: true },
                { name: '⚡ Status', value: 'Fully operational', inline: true },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Calkan Security • Cold. Precise. Unbreakable.' }
        }]
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) {
    const now = Date.now();
    const cooldown = dmCooldown.get(message.author.id);
    
    if (!cooldown) {
      dmCooldown.set(message.author.id, now);
      await message.reply({
        embeds: [{
          color: 0xFFD700,
          author: { name: 'Calkan Security', iconURL: client.user.displayAvatarURL() },
          title: '🛡️ DMs Not Accepted',
          description: 'This bot does not accept DMs.\nPlease use commands in your server.',
          timestamp: new Date().toISOString(),
          footer: { text: 'Calkan Security • Cold. Precise. Unbreakable.' }
        }]
      });
    }
    // Always ignore DM messages completely
    return;
  }
    if (config.trustedUserIds.includes(message.author.id)) return;

    const hasTrustedRole = message.member.roles.cache.some(r => config.trustedRoleIds.includes(r.id));
    
    if (hasTrustedRole) return;

    if (await checkSpam(message, config)) return;
    if (await checkInvites(message, config)) return;
    if (await checkLinks(message, config)) return;
    if (await checkPhishing(message, config)) return;
    if (await checkBannedWords(message, config)) return;
    if (await checkCaps(message, config)) return;
    if (await checkEmoji(message, config)) return;
    if (await checkMentions(message, config)) return;
    if (await checkDuplicates(message, config)) return;
    if (await checkZalgo(message, config)) return;
    if (await checkCharRepeat(message, config)) return;
    if (await checkPersonalInfo(message, config)) return;
    if (await checkMassMention(message, config)) return;
});

client.login(process.env.BOT_TOKEN);    