'use strict';

const db = require('../database');

const animals = [
  { species: 'Thỏ đồng', rarity: 'Thường', power: 3, weight: 44, emoji: '🐇' },
  { species: 'Sóc nâu', rarity: 'Thường', power: 4, weight: 34, emoji: '🐿️' },
  { species: 'Cáo đỏ', rarity: 'Hiếm', power: 9, weight: 14, emoji: '🦊' },
  { species: 'Sói băng', rarity: 'Sử thi', power: 18, weight: 6, emoji: '🐺' },
  { species: 'Rồng vàng', rarity: 'Huyền thoại', power: 35, weight: 2, emoji: '🐉' }
];
const rarityCoins = { Thường: 8, Hiếm: 20, 'Sử thi': 45, 'Huyền thoại': 100 };
const rarityXp = { Thường: 8, Hiếm: 14, 'Sử thi': 24, 'Huyền thoại': 40 };
const fish = [
  { id: 'fish', name: 'Cá thường', emoji: '🐟', weight: 60, xp: 5 },
  { id: 'salmon', name: 'Cá hồi', emoji: '🐠', weight: 27, xp: 9 },
  { id: 'tuna', name: 'Cá ngừ', emoji: '🐡', weight: 11, xp: 15 },
  { id: 'pearl', name: 'Ngọc trai', emoji: '🦪', weight: 2, xp: 22 }
];
const rarityColors = { Thường: 0x95a5a6, Hiếm: 0x3498db, 'Sử thi': 0x9b59b6, 'Huyền thoại': 0xf1c40f };
const rarityEmoji = { Thường: '⚪', Hiếm: '🔵', 'Sử thi': '🟣', 'Huyền thoại': '🟡' };

function weightedPick(list) {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of list) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}
function cooldown(message, action, seconds) {
  const remaining = db.checkAndSetCooldown(message.guildId, message.author.id, action, seconds * 1000);
  return remaining ? `⏳ Bạn cần chờ **${remaining} giây** nữa.` : null;
}
function money(value) { return `${Number(value).toLocaleString('vi-VN')} GWG Coin`; }
function addActionProgress(message, action) { db.advanceQuest(message.guildId, message.author.id, action); }
function rewardXp(message, amount) {
  const result = db.addXp(message.guildId, message.author.id, amount);
  return result.levelsGained ? `\n🎉 Bạn lên cấp **${result.level}**!` : '';
}
function started(message) {
  const player = db.getPlayer(message.guildId, message.author.id);
  return player?.started ? null : 'Chưa bắt đầu chơi. Hãy dùng `gstart` trước nhé!';
}

async function run(message, command, args) {
  const guildId = message.guildId;
  const userId = message.author.id;
  if (!guildId) return message.reply('GWG MINI chỉ hoạt động trong máy chủ Discord.');
  const player = db.ensurePlayer(guildId, userId);
  const names = { hunt: 'Săn thú', fish: 'Câu cá', battle: 'Chiến đấu', work: 'Làm việc' };

  switch (command) {
    case 'help':
      return message.reply([
        '**🌟 GWG MINI — hướng dẫn lệnh**',
        '`gstart` bắt đầu · `gbalance` xem GWG Coin · `gdaily` điểm danh',
        '`ghunt` săn thú · `gzoo` xem bộ sưu tập · `gbattle` đấu quái vật',
        '`gfish` câu cá · `gwork` làm việc · `gshop` xem cửa hàng · `gbuy <món> [số lượng]` mua',
        '`gsell <món> [số lượng]` bán cá/mồi · `ginventory` xem túi đồ · `gquest` xem/nhận nhiệm vụ',
        '`gleaderboard` bảng xếp hạng. Ví dụ: `gbuy bait 2`, `gquest claim hunt`.',
        'GWG Coin, thú, vật phẩm và cấp độ được lưu trong SQLite. Lệnh có hồi chiêu để giữ cân bằng.'
      ].join('\n'));
    case 'start': {
      if (!db.start(guildId, userId)) return message.reply('🎮 Bạn đã bắt đầu chơi GWG MINI rồi! Dùng `ghelp` để xem lệnh.');
      return message.reply(`🎉 Chào mừng **${message.member?.displayName || message.author.username}** đến GWG MINI! Bạn nhận **${money(player.coins)}** khởi đầu. Gõ ghelp để bắt đầu.`);
    }
    case 'balance': {
      const error = started(message); if (error) return message.reply(error);
      return message.reply(`💰 Bạn có **${money(player.coins)}** · cấp **${player.level}** · XP **${player.xp}/${player.level * 100}**.`);
    }
    case 'daily': {
      const error = started(message); if (error) return message.reply(error);
      const result = db.dailyReward(guildId, userId);
      return message.reply(result.ok ? `🎁 Nhận **${money(result.reward)}**! Chuỗi điểm danh: **${result.streak} ngày**.` : '📅 Bạn đã nhận thưởng hôm nay rồi. Ngày mai quay lại nhé!');
    }
    case 'hunt': {
      const error = started(message); if (error) return message.reply(error);
      const wait = cooldown(message, 'hunt', 30); if (wait) return message.reply(wait);
      const lucky = db.removeItem(guildId, userId, 'potion', 1);
      const pool = lucky ? [...animals, ...animals.filter((a) => ['Hiếm', 'Sử thi', 'Huyền thoại'].includes(a.rarity))] : animals;
      const animal = weightedPick(pool);
      db.catchAnimal(guildId, userId, animal);
      const coins = rarityCoins[animal.rarity];
      db.addCoins(guildId, userId, coins);
      db.addXp(guildId, userId, rarityXp[animal.rarity]);
      addActionProgress(message, 'hunt');
      return message.reply(`${animal.emoji} Bắt được **${animal.species}** ${rarityEmoji[animal.rarity]} **${animal.rarity}**! Sức mạnh **${animal.power}** · thưởng **${money(coins)}**.${lucky ? '\n🍀 Bùa may mắn đã được dùng.' : ''}${rewardXp(message, 0)}`);
    }
    case 'zoo': {
      const error = started(message); if (error) return message.reply(error);
      const list = db.getAnimals(guildId, userId);
      if (!list.length) return message.reply('🪹 Bộ sưu tập đang trống. Dùng `ghunt` để đi săn!');
      const lines = list.map((a) => `${rarityEmoji[a.rarity]} **${a.species}** — ${a.rarity} · sức mạnh ${a.power} · #${a.id}`);
      return message.reply(`🐾 **Bộ sưu tập thú** (hiển thị tối đa 30 con)\n${lines.join('\n')}`);
    }
    case 'battle': {
      const error = started(message); if (error) return message.reply(error);
      const wait = cooldown(message, 'battle', 25); if (wait) return message.reply(wait);
      const best = db.getBestAnimal(guildId, userId);
      const power = player.level * 4 + (best?.power || 0) + Math.floor(Math.random() * 16);
      const foePower = 8 + Math.floor(Math.random() * (player.level * 5 + 15));
      if (power < foePower) {
        db.addXp(guildId, userId, 5);
        return message.reply(`🛡️ Quái vật thắng trận này (**${foePower}** sức mạnh so với **${power}**). Bạn nhận **5 XP** để luyện tập. Hãy săn thú để tăng sức mạnh!`);
      }
      const coins = 25 + Math.floor(Math.random() * 46);
      db.addCoins(guildId, userId, coins);
      db.addXp(guildId, userId, 15);
      addActionProgress(message, 'battle');
      return message.reply(`⚔️ Bạn chiến thắng quái vật (**${power}** sức mạnh)! Nhận **${money(coins)}** và **15 XP**.${rewardXp(message, 0)}`);
    }
    case 'fish': {
      const error = started(message); if (error) return message.reply(error);
      const wait = cooldown(message, 'fish', 20); if (wait) return message.reply(wait);
      const bait = db.removeItem(guildId, userId, 'bait', 1);
      const pool = bait ? [...fish, fish[2], fish[3]] : fish;
      const caught = weightedPick(pool);
      db.grantItem(guildId, userId, caught.id, 1);
      db.addXp(guildId, userId, caught.xp);
      addActionProgress(message, 'fish');
      return message.reply(`🎣 Câu được **${caught.emoji} ${caught.name}**! Bán được **${money(db.shopItems[caught.id].sell)}** · nhận **${caught.xp} XP**.${bait ? '\n🪱 Đã dùng 1 mồi câu.' : ''}`);
    }
    case 'work': {
      const error = started(message); if (error) return message.reply(error);
      const wait = cooldown(message, 'work', 60); if (wait) return message.reply(wait);
      const coins = 25 + Math.floor(Math.random() * 36);
      db.addCoins(guildId, userId, coins);
      db.addXp(guildId, userId, 8);
      addActionProgress(message, 'work');
      return message.reply(`🛠️ Làm việc chăm chỉ, bạn nhận **${money(coins)}** và **8 XP**.`);
    }
    case 'shop': {
      const rows = Object.entries(db.shopItems).filter(([, item]) => item.price > 0).map(([id, item]) => `${item.emoji} **${item.name}** — ${id}: ${money(item.price)}\n└ ${item.description}`);
      return message.reply(`🏪 **Cửa hàng GWG**\n${rows.join('\n')}\nMua bằng gbuy <món> [số lượng].`);
    }
    case 'buy': {
      const error = started(message); if (error) return message.reply(error);
      const itemId = (args[0] || '').toLowerCase();
      const amount = Math.max(1, Math.min(99, Number.parseInt(args[1], 10) || 1));
      const item = db.shopItems[itemId];
      if (!item || item.price <= 0) return message.reply('Món hàng không hợp lệ. Dùng `gshop` để xem vật phẩm có thể mua.');
      const result = db.buy(guildId, userId, itemId, amount, item.price);
      return message.reply(result.ok ? `✅ Đã mua **${amount} ${item.emoji} ${item.name}** với giá **${money(result.cost)}**.` : '💸 Bạn không đủ GWG Coin hoặc số lượng mua không hợp lệ.');
    }
    case 'sell': {
      const error = started(message); if (error) return message.reply(error);
      const itemId = (args[0] || '').toLowerCase();
      const amount = Math.max(1, Math.min(99, Number.parseInt(args[1], 10) || 1));
      const item = db.shopItems[itemId];
      if (!item || item.sell <= 0) return message.reply('Vật phẩm này không thể bán. Cá bán được có trong `gshop`.');
      const result = db.sell(guildId, userId, itemId, amount, item.sell);
      return message.reply(result.ok ? `💰 Đã bán **${amount} ${item.emoji} ${item.name}**, nhận **${money(result.earned)}**.` : 'Bạn không có đủ vật phẩm để bán.');
    }
    case 'inventory': {
      const error = started(message); if (error) return message.reply(error);
      const inventory = db.getInventory(guildId, userId);
      if (!inventory.length) return message.reply('🎒 Túi đồ trống. Câu cá hoặc mua mồi ở `gshop` nhé!');
      const lines = inventory.map(({ item_id: id, quantity }) => `${db.shopItems[id]?.emoji || '📦'} **${db.shopItems[id]?.name || id}** × ${quantity}`);
      return message.reply(`🎒 **Túi đồ**\n${lines.join('\n')}`);
    }
    case 'leaderboard': {
      const rows = db.getLeaderboard(guildId);
      if (!rows.length) return message.reply('🏆 Chưa có ai bắt đầu chơi. Dùng `gstart` để tham gia!');
      const lines = rows.map((row, i) => `${['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`} <@${row.user_id}> — ${money(row.coins)} · cấp ${row.level}`);
      return message.reply({ content: `🏆 **Bảng xếp hạng GWG Coin**\n${lines.join('\n')}`, allowedMentions: { parse: [] } });
    }
    case 'quest': {
      const error = started(message); if (error) return message.reply(error);
      const quests = db.ensureQuests(guildId, userId);
      if ((args[0] || '').toLowerCase() === 'claim') {
        const id = (args[1] || '').toLowerCase();
        const result = db.claimQuest(guildId, userId, id);
        return message.reply(result.ok ? `🎁 Nhận thưởng nhiệm vụ **${names[id] || id}**: **${money(result.reward)}**!` : 'Nhiệm vụ chưa hoàn thành, không hợp lệ hoặc phần thưởng đã nhận.');
      }
      const lines = quests.map((quest) => `${quest.claimed ? '✅' : quest.progress >= quest.target ? '🎁' : '▫️'} **${names[quest.quest_id]}** — ${quest.progress}/${quest.target} · ${money(quest.reward)}`);
      return message.reply(`📜 **Nhiệm vụ hôm nay**\n${lines.join('\n')}\nNhận thưởng: gquest claim <hunt|fish|battle|work>.`);
    }
    default:
      return message.reply(`Không có lệnh g${command}. Gõ ghelp để xem hướng dẫn.`);
  }
}

module.exports = { run };
