'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const file = path.resolve(process.env.DATABASE_PATH || './data/gwg.sqlite');
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    coins INTEGER NOT NULL DEFAULT 100 CHECK(coins >= 0),
    xp INTEGER NOT NULL DEFAULT 0 CHECK(xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1),
    started INTEGER NOT NULL DEFAULT 0,
    last_daily TEXT,
    streak INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS caught_animals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    species TEXT NOT NULL,
    rarity TEXT NOT NULL,
    power INTEGER NOT NULL,
    caught_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id, user_id) REFERENCES players(guild_id, user_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_animals_owner ON caught_animals(guild_id, user_id);
  CREATE TABLE IF NOT EXISTS inventory (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    PRIMARY KEY (guild_id, user_id, item_id),
    FOREIGN KEY (guild_id, user_id) REFERENCES players(guild_id, user_id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS cooldowns (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id, action)
  );
  CREATE TABLE IF NOT EXISTS daily_quests (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    target INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    claimed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, day, quest_id),
    FOREIGN KEY (guild_id, user_id) REFERENCES players(guild_id, user_id) ON DELETE CASCADE
  );
`);

const q = {
  addPlayer: db.prepare('INSERT OR IGNORE INTO players(guild_id,user_id) VALUES(?,?)'),
  player: db.prepare('SELECT * FROM players WHERE guild_id=? AND user_id=?'),
  start: db.prepare('UPDATE players SET started=1 WHERE guild_id=? AND user_id=? AND started=0'),
  leaderboard: db.prepare('SELECT user_id,coins,level FROM players WHERE guild_id=? AND started=1 ORDER BY coins DESC,level DESC LIMIT 10'),
  animals: db.prepare('SELECT id,species,rarity,power,caught_at FROM caught_animals WHERE guild_id=? AND user_id=? ORDER BY power DESC,id DESC LIMIT 30'),
  bestAnimal: db.prepare('SELECT species,rarity,power FROM caught_animals WHERE guild_id=? AND user_id=? ORDER BY power DESC LIMIT 1'),
  addAnimal: db.prepare('INSERT INTO caught_animals(guild_id,user_id,species,rarity,power) VALUES(?,?,?,?,?)'),
  inventory: db.prepare('SELECT item_id,quantity FROM inventory WHERE guild_id=? AND user_id=? AND quantity>0 ORDER BY item_id'),
  item: db.prepare('SELECT quantity FROM inventory WHERE guild_id=? AND user_id=? AND item_id=?'),
  addItem: db.prepare(`INSERT INTO inventory(guild_id,user_id,item_id,quantity) VALUES(?,?,?,?)
    ON CONFLICT(guild_id,user_id,item_id) DO UPDATE SET quantity=quantity+excluded.quantity`),
  removeItem: db.prepare('UPDATE inventory SET quantity=quantity-? WHERE guild_id=? AND user_id=? AND item_id=? AND quantity>=?'),
  cooldown: db.prepare('SELECT expires_at FROM cooldowns WHERE guild_id=? AND user_id=? AND action=?'),
  setCooldown: db.prepare(`INSERT INTO cooldowns(guild_id,user_id,action,expires_at) VALUES(?,?,?,?)
    ON CONFLICT(guild_id,user_id,action) DO UPDATE SET expires_at=excluded.expires_at`),
  addCoins: db.prepare('UPDATE players SET coins=coins+? WHERE guild_id=? AND user_id=? AND coins+?>=0'),
  addXp: db.prepare('UPDATE players SET xp=xp+? WHERE guild_id=? AND user_id=?'),
  setLevel: db.prepare('UPDATE players SET level=?,xp=? WHERE guild_id=? AND user_id=?'),
  daily: db.prepare('UPDATE players SET coins=coins+?,last_daily=?,streak=? WHERE guild_id=? AND user_id=? AND last_daily IS NOT ?'),
  quests: db.prepare('SELECT quest_id,progress,target,reward,claimed FROM daily_quests WHERE guild_id=? AND user_id=? AND day=? ORDER BY quest_id'),
  addQuest: db.prepare('INSERT OR IGNORE INTO daily_quests(guild_id,user_id,day,quest_id,target,reward) VALUES(?,?,?,?,?,?)'),
  progressQuest: db.prepare('UPDATE daily_quests SET progress=MIN(target,progress+1) WHERE guild_id=? AND user_id=? AND day=? AND quest_id=?'),
  claimQuest: db.prepare('UPDATE daily_quests SET claimed=1 WHERE guild_id=? AND user_id=? AND day=? AND quest_id=? AND progress>=target AND claimed=0')
};

const questDefinitions = [
  ['hunt', 3, 60], ['fish', 2, 50], ['battle', 1, 80], ['work', 2, 40]
];
const today = () => new Date().toISOString().slice(0, 10);
function ensurePlayer(guildId, userId) {
  q.addPlayer.run(guildId, userId);
  return q.player.get(guildId, userId);
}
function addCoins(guildId, userId, amount) {
  const value = Math.trunc(amount);
  const result = q.addCoins.run(value, guildId, userId, value);
  return result.changes === 1;
}
function addXp(guildId, userId, amount) {
  const add = db.transaction(() => {
    q.addXp.run(Math.max(0, Math.trunc(amount)), guildId, userId);
    const player = q.player.get(guildId, userId);
    let level = player.level;
    let xp = player.xp;
    let levelsGained = 0;
    while (xp >= level * 100) { xp -= level * 100; level += 1; levelsGained += 1; }
    if (levelsGained) q.setLevel.run(level, xp, guildId, userId);
    return { level, levelsGained };
  });
  return add();
}
function start(guildId, userId) {
  ensurePlayer(guildId, userId);
  return q.start.run(guildId, userId).changes === 1;
}
function checkAndSetCooldown(guildId, userId, action, durationMs) {
  const run = db.transaction(() => {
    const now = Date.now();
    const expires = q.cooldown.get(guildId, userId, action)?.expires_at || 0;
    if (expires > now) return Math.ceil((expires - now) / 1000);
    q.setCooldown.run(guildId, userId, action, now + durationMs);
    return 0;
  });
  return run();
}
function grantItem(guildId, userId, itemId, amount = 1) {
  if (!Number.isInteger(amount) || amount <= 0) throw new RangeError('Số lượng vật phẩm không hợp lệ.');
  q.addItem.run(guildId, userId, itemId, amount);
}
function removeItem(guildId, userId, itemId, amount = 1) {
  if (!Number.isInteger(amount) || amount <= 0) return false;
  return q.removeItem.run(amount, guildId, userId, itemId, amount).changes === 1;
}
function buy(guildId, userId, itemId, amount, unitPrice) {
  if (![amount, unitPrice].every(Number.isSafeInteger) || amount < 1 || unitPrice < 0) return { ok: false, reason: 'invalid' };
  const cost = amount * unitPrice;
  if (!Number.isSafeInteger(cost)) return { ok: false, reason: 'invalid' };
  const run = db.transaction(() => {
    const debit = q.addCoins.run(-cost, guildId, userId, -cost);
    if (!debit.changes) return { ok: false, reason: 'funds' };
    q.addItem.run(guildId, userId, itemId, amount);
    return { ok: true, cost };
  });
  return run();
}
function sell(guildId, userId, itemId, amount, unitPrice) {
  if (![amount, unitPrice].every(Number.isSafeInteger) || amount < 1 || unitPrice < 0) return { ok: false, reason: 'invalid' };
  const earned = amount * unitPrice;
  if (!Number.isSafeInteger(earned)) return { ok: false, reason: 'invalid' };
  const run = db.transaction(() => {
    if (!removeItem(guildId, userId, itemId, amount)) return { ok: false, reason: 'items' };
    q.addCoins.run(earned, guildId, userId, earned);
    return { ok: true, earned };
  });
  return run();
}
function catchAnimal(guildId, userId, animal) {
  q.addAnimal.run(guildId, userId, animal.species, animal.rarity, animal.power);
}
function dailyReward(guildId, userId) {
  const player = q.player.get(guildId, userId);
  const day = today();
  if (!player || player.last_daily === day) return { ok: false };
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = player.last_daily === yesterday ? player.streak + 1 : 1;
  const reward = 100 + Math.min(streak - 1, 7) * 15;
  const result = q.daily.run(reward, day, streak, guildId, userId, day);
  return result.changes ? { ok: true, reward, streak } : { ok: false };
}
function ensureQuests(guildId, userId, day = today()) {
  for (const [id, target, reward] of questDefinitions) q.addQuest.run(guildId, userId, day, id, target, reward);
  return q.quests.all(guildId, userId, day);
}
function advanceQuest(guildId, userId, id) {
  const day = today();
  ensureQuests(guildId, userId, day);
  q.progressQuest.run(guildId, userId, day, id);
}
function claimQuest(guildId, userId, id) {
  const run = db.transaction(() => {
    const quests = ensureQuests(guildId, userId);
    const quest = quests.find((entry) => entry.quest_id === id);
    if (!quest || !q.claimQuest.run(guildId, userId, today(), id).changes) return { ok: false };
    q.addCoins.run(quest.reward, guildId, userId, quest.reward);
    return { ok: true, reward: quest.reward };
  });
  return run();
}

const shopItems = {
  bait: { name: 'Mồi câu', emoji: '🪱', price: 20, sell: 8, description: 'Mồi câu cá.' },
  potion: { name: 'Thuốc may mắn', emoji: '🍀', price: 50, sell: 20, description: 'Tăng cơ hội săn thú hiếm trong một lần.' },
  fish: { name: 'Cá thường', emoji: '🐟', price: 0, sell: 12, description: 'Cá bắt được khi câu.' },
  salmon: { name: 'Cá hồi', emoji: '🐠', price: 0, sell: 30, description: 'Cá quý bắt được khi câu.' },
  tuna: { name: 'Cá ngừ', emoji: '🐡', price: 0, sell: 55, description: 'Cá hiếm bắt được khi câu.' },
  pearl: { name: 'Ngọc trai', emoji: '🦪', price: 0, sell: 100, description: 'Vật phẩm quý.' }
};

module.exports = {
  db, today, ensurePlayer, start, addCoins, addXp, checkAndSetCooldown,
  grantItem, removeItem, buy, sell, catchAnimal, dailyReward, ensureQuests,
  advanceQuest, claimQuest, shopItems,
  getPlayer: (g, u) => q.player.get(g, u),
  getAnimals: (g, u) => q.animals.all(g, u),
  getBestAnimal: (g, u) => q.bestAnimal.get(g, u),
  getInventory: (g, u) => q.inventory.all(g, u),
  getItemCount: (g, u, id) => q.item.get(g, u, id)?.quantity || 0,
  getLeaderboard: (g) => q.leaderboard.all(g)
};
