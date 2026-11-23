'use strict';

const { EmbedBuilder } = require('discord.js');
const db = require('./db');

const ITEMS = {
  potion: { name: 'Thuốc hồi phục', emoji: '🧪', price: 45, description: 'Dùng để nhận 40 xu.' },
  bait: { name: 'Mồi câu', emoji: '🪱', price: 20, description: 'Tăng cơ hội câu được cá hiếm; tiêu hao khi câu.' },
  lucky_charm: { name: 'Bùa may mắn', emoji: '🍀', price: 90, description: 'Tăng cơ hội nhận chiến lợi phẩm quý trong một lần săn.' },
  pearl: { name: 'Ngọc trai', emoji: '🦪', price: 120, description: 'Vật phẩm quý có thể bán lại bằng lệnh gsell.' }
};
const SPECIES = [
  { name: 'Mèo rừng', power: 5, cost: 180, emoji: '🐈' },
  { name: 'Cáo tuyết', power: 8, cost: 320, emoji: '🦊' },
  { name: 'Rồng con', power: 13, cost: 650, emoji: '🐉' }
];
const LOOT = [
  { id: 'hide', name: 'Da thú', emoji: '🟫', value: 18 },
  { id: 'feather', name: 'Lông vũ', emoji: '🪶', value: 14 },
  { id: 'meat', name: 'Thịt rừng', emoji: '🍖', value: 22 },
  { id: 'pearl', name: 'Ngọc trai', emoji: '🦪', value: 60 }
];
const FISH = [
  { id: 'fish', name: 'Cá rô', emoji: '🐟', value: 18, weight: 55 },
  { id: 'salmon', name: 'Cá hồi', emoji: '🐠', value: 35, weight: 28 },
  { id: 'tuna', name: 'Cá ngừ', emoji: '🐡', value: 65, weight: 13 },
  { id: 'pearl', name: 'Ngọc trai', emoji: '🦪', value: 100, weight: 4 }
];
const ADVENTURES = [
  { name: 'Khu rừng cổ', danger: 0.25, reward: [70, 150], xp: [18, 35] },
  { name: 'Hang động bí ẩn', danger: 0.4, reward: [110, 230], xp: [25, 45] },
  { name: 'Đỉnh núi rồng', danger: 0.55, reward: [160, 320], xp: [35, 60] }
];
const QUEST_NAMES = { hunt: 'Săn bắt 3 lần', fish: 'Câu cá 2 lần', battle: 'Thắng 1 trận' };
const dayKey = () => new Date().toISOString().slice(0, 10);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const guildKey = (message) => message.guildId || 'dm';
const username = (message) => message.member?.displayName || message.author.username;
const reply = (message, text) => message.reply({ content: text, allowedMentions: { repliedUser: false } });
const money = (amount) => `${Number(amount).toLocaleString('vi-VN')} xu`;
function makeEmbed(title, description, color = 0x7c3aed) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setFooter({ text: 'GWG BOT • Chơi vui, chơi lành mạnh' });
}
function checkCooldown(message, action, seconds) {
  const remaining = db.cooldownRemaining(guildKey(message), message.author.id, action);
  if (remaining > 0) return Math.ceil(remaining / 1000);
  db.setCooldown(guildKey(message), message.author.id, action, seconds * 1000);
  return 0;
}
function profileDescription(user, memberName) {
  const needed = user.level * 100;
  return `**${memberName}**\n⭐ Cấp **${user.level}** · Kinh nghiệm **${user.xp}/${needed}**\n💰 Số dư **${money(user.coins)}**\n🔥 Chuỗi điểm danh **${user.streak} ngày**`;
}

async function execute(message, command, args) {
  const guildId = guildKey(message);
  const userId = message.author.id;
  const user = db.ensureUser(guildId, userId);
  const sub = (args[0] || '').toLowerCase();
  const levelMessage = (result) => result.leveled ? `\n🎉 Lên cấp! Bạn hiện ở cấp **${result.level}**.` : '';

  switch (command) {
    case 'help': case 'trogiup': {
      const text = [
        '**Lệnh GWG BOT** (mọi lệnh bắt đầu bằng `g`, không dùng dấu `!` hay slash):',
        '`ghelp` · xem hướng dẫn | `gprofile` · hồ sơ | `gbalance` · số dư | `gdaily` · điểm danh | `gwork` · làm việc',
        '`ghunt` · săn bắt | `gzoo` · xem thú cưng | `gpet` · nhận/đổi thú cưng | `gbattle [@người chơi]` · chiến đấu',
        '`gadventure [1-3]` · thám hiểm | `gfishing` hoặc `gfish` · câu cá | `ginventory` · túi đồ | `guse <vật phẩm>` · dùng đồ',
        '`gshop` · cửa hàng | `gbuy <vật phẩm> [số lượng]` · mua | `gsell <vật phẩm> [số lượng]` · bán',
        '`gquest` · nhiệm vụ ngày | `gleaderboard` · bảng xếp hạng',
        'Mẹo: `gpet adopt <1-3>` để nhận thú cưng; `gpet active <id>` để chọn thú đồng hành.'
      ].join('\n');
      return message.reply({ embeds: [makeEmbed('🌟 Chào mừng đến với GWG!', text)], allowedMentions: { repliedUser: false } });
    }
    case 'profile': case 'me': case 'hoso':
      return message.reply({ embeds: [makeEmbed('🧑 Hồ sơ nhà thám hiểm', profileDescription(user, username(message)))], allowedMentions: { repliedUser: false } });
    case 'balance': case 'bal': case 'xu':
      return reply(message, `💰 **${username(message)}**, bạn đang có **${money(user.coins)}**.`);
    case 'daily': case 'diemdanh': {
      const today = dayKey();
      if (user.last_daily === today) return reply(message, '⏳ Bạn đã điểm danh hôm nay rồi. Hãy quay lại vào ngày mai nhé!');
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = user.last_daily === yesterday ? user.streak + 1 : 1;
      const reward = 100 + Math.min(streak - 1, 7) * 15;
      db.addCoins(guildId, userId, reward);
      db.claimDaily(guildId, userId, today, streak);
      return reply(message, `🎁 Điểm danh thành công! Bạn nhận **${money(reward)}**. Chuỗi hiện tại: **${streak} ngày**.`);
    }
    case 'work': case 'lamviec': {
      const wait = checkCooldown(message, 'work', 60);
      if (wait) return reply(message, `⏳ Bạn cần nghỉ thêm **${wait} giây** trước khi làm việc tiếp.`);
      const earned = randomInt(25, 65);
      db.addCoins(guildId, userId, earned);
      const xp = db.addXp(guildId, userId, 8);
      return reply(message, `🛠️ Bạn làm một ca việc chăm chỉ và nhận **${money(earned)}**, **8 XP**.${levelMessage(xp)}`);
    }
    case 'hunt': case 'san': {
      const wait = checkCooldown(message, 'hunt', 30);
      if (wait) return reply(message, `🏹 Bạn cần chờ **${wait} giây** để chuẩn bị chuyến săn tiếp theo.`);
      const charm = db.removeItem(guildId, userId, 'lucky_charm', 1);
      const found = pick(charm ? [...LOOT, LOOT[3], LOOT[3]] : LOOT);
      const quantity = found.id === 'pearl' ? 1 : randomInt(1, 2);
      db.addItem(guildId, userId, found.id, quantity);
      const earned = randomInt(8, 24);
      db.addCoins(guildId, userId, earned);
      const xp = db.addXp(guildId, userId, 15);
      db.grantPetXp(guildId, userId, 8);
      db.progressQuest(guildId, userId, 'hunt');
      return message.reply({ embeds: [makeEmbed('🏹 Chuyến săn thành công!', `Bạn tìm thấy **${quantity} ${found.emoji} ${found.name}** và nhặt được **${money(earned)}**.\n⭐ Nhận **15 XP**.${charm ? '\n🍀 Bùa may mắn đã được dùng.' : ''}${levelMessage(xp)}`, 0x16a34a)], allowedMentions: { repliedUser: false } });
    }
    case 'zoo': case 'vuon': {
      const pets = db.pets(guildId, userId);
      if (!pets.length) return reply(message, '🪹 Vườn thú của bạn còn trống. Dùng `gpet adopt <1-3>` để nhận thú cưng.');
      const lines = pets.map((pet) => `${pet.active ? '💚' : '▫️'} **#${pet.id} ${pet.name}** (${pet.species}) · cấp ${pet.level} · sức mạnh ${pet.power}${pet.active ? ' · đang đồng hành' : ''}`);
      return message.reply({ embeds: [makeEmbed('🐾 Vườn thú GWG', lines.join('\n'))], allowedMentions: { repliedUser: false } });
    }
    case 'pet': case 'thucung': {
      if (sub === 'adopt' || sub === 'nhan') {
        const choice = Number(args[1]);
        const species = SPECIES[choice - 1];
        if (!species) return reply(message, 'Hãy chọn `gpet adopt 1`, `2` hoặc `3`. Các thú: Mèo rừng 180 xu, Cáo tuyết 320 xu, Rồng con 650 xu.');
        if (db.petCount(guildId, userId) >= 10) return reply(message, '🏡 Vườn thú đã đủ 10 thú cưng.');
        if (user.coins < species.cost) return reply(message, `Bạn cần **${money(species.cost)}** để nhận ${species.name}.`);
        db.addCoins(guildId, userId, -species.cost);
        const id = db.addPet(guildId, userId, `${species.name} ${db.petCount(guildId, userId) + 1}`, species.name, species.power, db.petCount(guildId, userId) === 0 ? 1 : 0);
        return reply(message, `${species.emoji} Chào mừng **${species.name} #${id}** đến với vườn thú!${db.petCount(guildId, userId) === 1 ? ' Bé đã trở thành thú đồng hành.' : ''}`);
      }
      if (sub === 'active' || sub === 'chon') {
        const id = Number(args[1]);
        if (!Number.isInteger(id) || !db.activatePet(guildId, userId, id)) return reply(message, 'Không tìm thấy thú cưng đó. Xem danh sách bằng `gzoo`.');
        return reply(message, `💚 Đã chọn thú cưng **#${id}** đồng hành cùng bạn.`);
      }
      return reply(message, 'Dùng `gpet adopt <1-3>` để nhận thú hoặc `gpet active <id>` để chọn thú đồng hành.');
    }
    case 'battle': case 'dau': {
      const wait = checkCooldown(message, 'battle', 20);
      if (wait) return reply(message, `⚔️ Hãy chờ **${wait} giây** trước trận đấu tiếp theo.`);
      const target = message.mentions.users.first();
      const pet = db.activePet(guildId, userId);
      const ownPower = user.level * 3 + (pet?.power || 0) + randomInt(1, 20);
      if (target) {
        if (target.bot || target.id === userId) return reply(message, 'Bạn cần chọn một người chơi khác, không phải bot hoặc chính mình.');
        db.ensureUser(guildId, target.id);
        const enemy = db.ensureUser(guildId, target.id);
        const enemyPet = db.activePet(guildId, target.id);
        const enemyPower = enemy.level * 3 + (enemyPet?.power || 0) + randomInt(1, 20);
        const won = ownPower >= enemyPower;
        let wager = 0;
        if (won) {
          wager = db.transferBattleCoins(guildId, userId, target.id);
          db.addCoins(guildId, userId, 35);
          const xp = db.addXp(guildId, userId, 20);
          db.progressQuest(guildId, userId, 'battle');
          db.grantPetXp(guildId, userId, 12);
          return reply(message, `🏆 **${username(message)}** thắng ${target} trong trận đấu! Thưởng **35 xu**, cướp **${money(wager)}**, nhận **20 XP**.${levelMessage(xp)}`);
        }
        db.addCoins(guildId, userId, 10);
        db.addXp(guildId, userId, 5);
        const transfer = db.transferBattleCoins(guildId, target.id, userId);
        return reply(message, `💨 ${target} thắng trận này! Bạn nhận **10 xu an ủi**, nhưng mất **${money(transfer)}** tiền cược.`);
      }
      const enemyPower = randomInt(8, 38);
      if (ownPower >= enemyPower) {
        const earned = randomInt(35, 90);
        db.addCoins(guildId, userId, earned);
        const xp = db.addXp(guildId, userId, 24);
        db.progressQuest(guildId, userId, 'battle');
        db.grantPetXp(guildId, userId, 15);
        return reply(message, `⚔️ Bạn đánh bại quái vật hoang dã! Nhận **${money(earned)}**, **24 XP**.${levelMessage(xp)}`);
      }
      const lost = Math.min(user.coins, randomInt(5, 20));
      db.addCoins(guildId, userId, -lost);
      db.addXp(guildId, userId, 8);
      return reply(message, `🩹 Quái vật mạnh hơn dự tính. Bạn mất **${money(lost)}**, nhưng vẫn học được **8 XP**. Hãy lên cấp hoặc tìm thú đồng hành!`);
    }
    case 'adventure': case 'thamdohiem': {
      const wait = checkCooldown(message, 'adventure', 90);
      if (wait) return reply(message, `🧭 Hãy chờ **${wait} giây** để hồi sức trước chuyến thám hiểm.`);
      const area = ADVENTURES[(Number(args[0]) || 1) - 1];
      if (!area) return reply(message, 'Chọn địa điểm: `gadventure 1` Khu rừng, `2` Hang động, `3` Đỉnh núi rồng.');
      if (Math.random() < area.danger) {
        const lost = Math.min(user.coins, randomInt(10, 35));
        db.addCoins(guildId, userId, -lost);
        db.addXp(guildId, userId, 12);
        return reply(message, `🌪️ Bạn gặp bão tại **${area.name}** và phải quay về. Mất **${money(lost)}**, nhưng nhận **12 XP** kinh nghiệm.`);
      }
      const earned = randomInt(...area.reward);
      const xpAmount = randomInt(...area.xp);
      const xp = db.addXp(guildId, userId, xpAmount);
      db.addCoins(guildId, userId, earned);
      const loot = pick(LOOT);
      db.addItem(guildId, userId, loot.id, 1);
      db.progressQuest(guildId, userId, 'hunt');
      db.grantPetXp(guildId, userId, 20);
      return reply(message, `🧭 Chuyến đi **${area.name}** thành công! Bạn mang về **${money(earned)}**, **${loot.emoji} ${loot.name}** và **${xpAmount} XP**.${levelMessage(xp)}`);
    }
    case 'fish': case 'fishing': case 'cauca': {
      const wait = checkCooldown(message, 'fish', 25);
      if (wait) return reply(message, `🎣 Hãy chờ **${wait} giây** để thả câu lần nữa.`);
      const bait = db.removeItem(guildId, userId, 'bait', 1);
      const table = bait ? [...FISH, FISH[2], FISH[3]] : FISH;
      const total = table.reduce((sum, item) => sum + item.weight, 0);
      let roll = Math.random() * total;
      let caught = table[0];
      for (const fish of table) { roll -= fish.weight; if (roll <= 0) { caught = fish; break; } }
      db.addItem(guildId, userId, caught.id, 1);
      const xp = db.addXp(guildId, userId, 12);
      db.progressQuest(guildId, userId, 'fish');
      db.grantPetXp(guildId, userId, 8);
      return reply(message, `🎣 Bạn câu được **${caught.emoji} ${caught.name}** (bán được ${money(caught.value)}) và nhận **12 XP**.${bait ? '\n🪱 Mồi câu đã được sử dụng.' : ''}${levelMessage(xp)}`);
    }
    case 'inventory': case 'inv': case 'tui': {
      const items = db.inventoryList(guildId, userId);
      if (!items.length) return reply(message, '🎒 Túi đồ của bạn đang trống. Hãy đi săn hoặc câu cá!');
      const lines = items.map(({ item_id: id, quantity }) => {
        const item = ITEMS[id] || [...LOOT, ...FISH].find((entry) => entry.id === id);
        return `${item?.emoji || '📦'} **${item?.name || id}** × ${quantity}`;
      });
      return message.reply({ embeds: [makeEmbed('🎒 Túi đồ', lines.join('\n'))], allowedMentions: { repliedUser: false } });
    }
    case 'shop': case 'cuahang': {
      const lines = Object.entries(ITEMS).map(([id, item]) => `${item.emoji} **${item.name}** — ${money(item.price)} · ${id}\n└ ${item.description}`);
      return message.reply({ embeds: [makeEmbed('🏪 Cửa hàng GWG', `${lines.join('\n')}\n\nMua bằng gbuy <tên_vật_phẩm> [số_lượng]. Ví dụ: gbuy bait 3`)], allowedMentions: { repliedUser: false } });
    }
    case 'buy': case 'mua': {
      const itemId = sub;
      const quantity = Math.min(99, Math.max(1, Number(args[1]) || 1));
      const item = ITEMS[itemId];
      if (!item) return reply(message, 'Vật phẩm không hợp lệ. Dùng `gshop` để xem cửa hàng.');
      const cost = item.price * quantity;
      if (user.coins < cost) return reply(message, `Bạn cần **${money(cost)}** để mua ${quantity} ${item.name}.`);
      db.addCoins(guildId, userId, -cost);
      db.addItem(guildId, userId, itemId, quantity);
      return reply(message, `✅ Đã mua **${quantity} ${item.emoji} ${item.name}** với giá **${money(cost)}**.`);
    }
    case 'sell': case 'ban': {
      const itemId = sub;
      const quantity = Math.min(99, Math.max(1, Number(args[1]) || 1));
      const item = ITEMS[itemId] || [...LOOT, ...FISH].find((entry) => entry.id === itemId);
      if (!item) return reply(message, 'Không thể bán vật phẩm này. Xem tên vật phẩm trong `ginventory`.');
      if (!db.removeItem(guildId, userId, itemId, quantity)) return reply(message, `Bạn không có đủ **${item.name}** để bán.`);
      const prices = { ...Object.fromEntries(Object.entries(ITEMS).map(([id, value]) => [id, Math.floor(value.price * 0.5)])), ...Object.fromEntries([...LOOT, ...FISH].map((value) => [value.id, value.value])) };
      const earned = (prices[itemId] || 5) * quantity;
      db.addCoins(guildId, userId, earned);
      return reply(message, `💰 Bạn bán **${quantity} ${item.emoji} ${item.name}** và nhận **${money(earned)}**.`);
    }
    case 'use': case 'dung': {
      const id = sub;
      if (id !== 'potion') return reply(message, 'Hiện chỉ có thể dùng `potion` (Thuốc hồi phục).');
      if (!db.removeItem(guildId, userId, id, 1)) return reply(message, 'Bạn không có Thuốc hồi phục trong túi. Mua tại `gshop`.');
      db.addCoins(guildId, userId, 40);
      return reply(message, '🧪 Bạn dùng Thuốc hồi phục và nhận **40 xu**.');
    }
    case 'quest': case 'questlog': case 'nhiemvu': {
      const quests = db.dailyQuests(guildId, userId, dayKey());
      const lines = quests.map((quest) => `${quest.claimed ? '✅' : quest.progress >= quest.target ? '🎁' : '▫️'} **${QUEST_NAMES[quest.quest_type]}** — ${Math.min(quest.progress, quest.target)}/${quest.target} · thưởng ${money(quest.reward)}${quest.claimed ? ' · đã nhận' : ''}`);
      if (sub === 'claim' || sub === 'nhan') {
        const type = (args[1] || '').toLowerCase();
        const quest = quests.find((entry) => entry.quest_type === type);
        if (!quest) return reply(message, 'Chọn nhiệm vụ `hunt`, `fish` hoặc `battle`: `gquest claim hunt`.');
        if (!db.claimQuest(guildId, userId, dayKey(), type)) return reply(message, 'Nhiệm vụ chưa hoàn thành hoặc phần thưởng đã được nhận.');
        db.addCoins(guildId, userId, quest.reward);
        return reply(message, `🎉 Hoàn thành nhiệm vụ! Bạn nhận **${money(quest.reward)}**.`);
      }
      return message.reply({ embeds: [makeEmbed('📜 Nhiệm vụ hằng ngày', `${lines.join('\n')}\n\nNhận thưởng: gquest claim <hunt|fish|battle>. Nhiệm vụ làm mới mỗi ngày.`)], allowedMentions: { repliedUser: false } });
    }
    case 'leaderboard': case 'top': case 'bxh': {
      const rows = db.leaderboard(guildId);
      const lines = rows.map((row, index) => `${['🥇', '🥈', '🥉'][index] || `**${index + 1}.**`} <@${row.user_id}> — ${money(row.coins)} · cấp ${row.level}`);
      return message.reply({ embeds: [makeEmbed('🏆 Đại gia GWG', lines.join('\n') || 'Chưa có nhà thám hiểm nào.')], allowedMentions: { parse: [] } });
    }
    default:
      return reply(message, `Không tìm thấy lệnh **g${command}**. Gõ ghelp để xem các lệnh hiện có.`);
  }
}

module.exports = { execute };
