'use strict';

require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { ensureUser, db } = require('./db');
const { execute } = require('./commands');

const token = process.env.DISCORD_TOKEN;
if (!token || token === 'thay_bang_token_bot') {
  console.error('Thiếu DISCORD_TOKEN. Hãy sao chép .env.example thành .env và điền token bot Discord.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`GWG BOT đã sẵn sàng: ${client.user.tag}`);
  client.user.setActivity('ghelp • thế giới GWG', { type: 0 });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content) return;
  const content = message.content.trim();
  // Prefix đúng một chữ g đứng liền trước tên lệnh: ghelp, ghunt, gbattle...
  if (!/^g[a-zA-ZÀ-ỹ0-9_-]+(?:\s|$)/u.test(content)) return;
  const [rawCommand, ...args] = content.split(/\s+/u);
  const command = rawCommand.slice(1).toLowerCase();
  const guildId = message.guildId || 'dm';
  ensureUser(guildId, message.author.id);
  try {
    await execute(message, command, args);
  } catch (error) {
    console.error(`Lỗi khi xử lý g${command}:`, error);
    await message.reply({ content: '⚠️ Có lỗi khi xử lý lệnh. Dữ liệu của bạn vẫn an toàn; hãy thử lại sau.', allowedMentions: { repliedUser: false } }).catch(() => {});
  }
});

client.on('error', (error) => console.error('Lỗi Discord:', error));
process.on('SIGINT', () => { db.close(); client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); client.destroy(); process.exit(0); });

client.login(token).catch((error) => {
  console.error('Không thể đăng nhập Discord. Hãy kiểm tra DISCORD_TOKEN và quyền bot:', error.message);
  process.exit(1);
});
