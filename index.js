'use strict';

require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleMessage } = require('./commands');
const { db } = require('./database');

const token = process.env.DISCORD_TOKEN?.trim();
const prefix = 'g';
if (!token) {
  console.error('⚠️ Chưa có Discord Bot Token. Mở file .env, dán token vào dòng DISCORD_TOKEN= rồi chạy lại bot.');
  process.exit(1);
}
if (process.env.PREFIX && process.env.PREFIX !== prefix) {
  console.error('⚠️ Prefix GWG MINI được cố định là chữ g. Hãy đặt PREFIX=g trong file .env.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`✅ GWG MINI đã kết nối Discord thành công: ${client.user.tag}`);
  client.user.setActivity('ghelp • GWG MINI');
});
client.on('messageCreate', (message) => handleMessage(message, prefix));
client.on('error', (error) => console.error('Lỗi kết nối Discord:', error));
process.once('SIGINT', () => { db.close(); client.destroy(); process.exit(0); });
process.once('SIGTERM', () => { db.close(); client.destroy(); process.exit(0); });
client.login(token).catch((error) => {
  console.error(`❌ Không thể kết nối Discord: ${error.message}`);
  console.error('Kiểm tra token trong .env và bật Message Content Intent trong Discord Developer Portal.');
  db.close();
  process.exit(1);
});
