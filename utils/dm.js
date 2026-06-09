const { EmbedBuilder } = require('discord.js');

async function dmUser(member, reason, action) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setAuthor({ name: 'Calkan Security', iconURL: member.client.user.displayAvatarURL() })
      .setTitle('⚠️ Moderation Action Taken')
      .setDescription(`You received a **${action}** in **${member.guild.name}**`)
      .addFields(
        { name: '📋 Reason', value: reason, inline: true },
        { name: '🏠 Server', value: member.guild.name, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Calkan Security • Appeal to a moderator if you think this is wrong' });

    await member.user.send({ embeds: [embed] });
  } catch {
    // User has DMs disabled — ignore silently
  }
}

module.exports = { dmUser };