require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { checkSpam } = require('./handlers/autoMod');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

client.on('clientReady', async () => {
    console.log(`✅ ${client.user.tag} is online!`);

    const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    logChannel.send('🛡️ Calkan is online and protecting the server!');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    await checkSpam(message);
});

client.login(process.env.BOT_TOKEN);