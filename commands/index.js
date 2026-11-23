'use strict';

const { run } = require('../systems/game');

const commandNames = new Set([
  'help', 'start', 'balance', 'daily', 'hunt', 'zoo', 'battle', 'fish',
  'work', 'shop', 'buy', 'sell', 'inventory', 'leaderboard', 'quest'
]);

async function handleMessage(message, prefix = 'g') {
  if (message.author.bot || !message.guildId) return;
  const content = message.content.trim();
  if (!content.startsWith(prefix) || content.length <= prefix.length) return;
  const commandLine = content.slice(prefix.length).trim();
  if (!commandLine || /^[/!]/u.test(commandLine)) return;
  const [command, ...args] = commandLine.split(/\s+/u);
  const normalized = command.toLowerCase();
  if (!commandNames.has(normalized)) return;
  try {
    await run(message, normalized, args);
  } catch (error) {
    console.error(`Lỗi khi xử lý lệnh ${prefix}${normalized}:`, error);
    await message.reply({ content: '⚠️ Có lỗi khi xử lý lệnh. Dữ liệu đã được bảo vệ; vui lòng thử lại sau.', allowedMentions: { repliedUser: false } }).catch(() => {});
  }
}

module.exports = { handleMessage, commandNames };
