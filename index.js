require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

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

client.login(process.env.BOT_TOKEN);