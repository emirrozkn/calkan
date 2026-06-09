const { EmbedBuilder } = require('discord.js');

let caseNumber = 0;

function getNextCase() {
    caseNumber++;
    return caseNumber;
}

const COLORS = {
  gold: 0xFFD700,
  red: 0xFF0000,
  green: 0x00FF00,
  orange: 0xFF8C00,
  gray: 0x2C2C2C,
};

const FOOTER_TEXT = {
  gold: 'Calkan Security • INFO',
  red: 'Calkan Security • HIGH ALERT',
  green: 'Calkan Security • SUCCESS',
  orange: 'Calkan Security • WARNING',
  gray: 'Calkan Security • LOG',
};

async function log(client, type, data) {
  try {
    const channelMap = {
        mod: process.env.LOG_CHANNEL_ID,
        join: process.env.JOIN_LOG_CHANNEL_ID,
        message: process.env.MESSAGE_LOG_CHANNEL_ID,
    };

    const channelId = channelMap[type] || channelMap.mod;
    const channel = await client.channels.fetch(channelId);

    if (!channel) return;

    const color = data.color || 'gold';

    const embed = new EmbedBuilder()
      .setColor(COLORS[color])
      .setAuthor({ name: 'Calkan Security', iconURL: client.user.displayAvatarURL() })
      .setTitle(`Case #${getNextCase()} • ${data.title}`)
      .setDescription(data.description)
      .setTimestamp()
      .setFooter({ text: FOOTER_TEXT[color] });

    if (data.fields) {
      embed.addFields(data.fields);
    }

    await channel.send({ embeds: [embed] });

  } catch (err) {
    console.error(`[Logger] Failed to send log: ${err.message}`);
  }
}

module.exports = { log, getNextCase };