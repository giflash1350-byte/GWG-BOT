'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const databasePath = path.resolve(process.env.DATABASE_PATH || './data/gwg.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    coins INTEGER NOT NULL DEFAULT 100,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak INTEGER NOT NULL DEFAULT 0,
    last_daily TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS inventory (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    PRIMARY KEY (guild_id, user_id, item_id),
    FOREIGN KEY (guild_id, user_id) REFERENCES users(guild_id, user_id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    power INTEGER NOT NULL DEFAULT 1,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 0,
    adopted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id, user_id) REFERENCES users(guild_id, user_id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS cooldowns (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id, action)
  );
  CREATE TABLE IF NOT EXISTS quests (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    quest_type TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    target INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    claimed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, day, quest_type),
    FOREIGN KEY (guild_id, user_id) REFERENCES users(guild_id, user_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_users_leaderboard ON users(guild_id, coins DESC);
  CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(guild_id, user_id);
`);

const statements = {
  ensureUser: db.prepare('INSERT OR IGNORE INTO users (guild_id, user_id) VALUES (?, ?)'),
  user: db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?'),
  addCoins: db.prepare('UPDATE users SET coins = MAX(0, coins + ?) WHERE guild_id = ? AND user_id = ?'),
  setCoins: db.prepare('UPDATE users SET coins = ? WHERE guild_id = ? AND user_id = ?'),
  addXp: db.prepare('UPDATE users SET xp = xp + ? WHERE guild_id = ? AND user_id = ?'),
  setLevelXp: db.prepare('UPDATE users SET level = ?, xp = ? WHERE guild_id = ? AND user_id = ?'),
  daily: db.prepare('UPDATE users SET last_daily = ?, streak = ? WHERE guild_id = ? AND user_id = ?'),
  inventory: db.prepare('SELECT quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?'),
  inventoryList: db.prepare('SELECT item_id, quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND quantity > 0 ORDER BY item_id'),
  addItem: db.prepare(`INSERT INTO inventory (guild_id, user_id, item_id, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity`),
  removeItem: db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE guild_id = ? AND user_id = ? AND item_id = ? AND quantity >= ?'),
  cooldown: db.prepare('SELECT expires_at FROM cooldowns WHERE guild_id = ? AND user_id = ? AND action = ?'),
  setCooldown: db.prepare(`INSERT INTO cooldowns (guild_id, user_id, action, expires_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id, action) DO UPDATE SET expires_at = excluded.expires_at`),
  pets: db.prepare('SELECT * FROM pets WHERE guild_id = ? AND user_id = ? ORDER BY active DESC, id'),
  activePet: db.prepare('SELECT * FROM pets WHERE guild_id = ? AND user_id = ? AND active = 1 LIMIT 1'),
  petCount: db.prepare('SELECT COUNT(*) AS count FROM pets WHERE guild_id = ? AND user_id = ?'),
  addPet: db.prepare('INSERT INTO pets (guild_id, user_id, name, species, power, active) VALUES (?, ?, ?, ?, ?, ?)'),
  setPetActive: db.prepare('UPDATE pets SET active = 0 WHERE guild_id = ? AND user_id = ?'),
  activatePet: db.prepare('UPDATE pets SET active = 1 WHERE guild_id = ? AND user_id = ? AND id = ?'),
  petXp: db.prepare('UPDATE pets SET xp = xp + ? WHERE id = ?'),
  petLevel: db.prepare('UPDATE pets SET level = ?, xp = ?, power = ? WHERE id = ?'),
  leaderboard: db.prepare('SELECT user_id, coins, level FROM users WHERE guild_id = ? ORDER BY coins DESC, level DESC LIMIT 10'),
  ensureQuest: db.prepare(`INSERT OR IGNORE INTO quests (guild_id, user_id, day, quest_type, target, reward) VALUES (?, ?, ?, ?, ?, ?)`),
  quests: db.prepare('SELECT * FROM quests WHERE guild_id = ? AND user_id = ? AND day = ? ORDER BY quest_type'),
  questProgress: db.prepare('UPDATE quests SET progress = MIN(target, progress + ?) WHERE guild_id = ? AND user_id = ? AND day = ? AND quest_type = ?'),
  claimQuest: db.prepare('UPDATE quests SET claimed = 1 WHERE guild_id = ? AND user_id = ? AND day = ? AND quest_type = ? AND progress >= target AND claimed = 0')
};

function ensureUser(guildId, userId) {
  statements.ensureUser.run(guildId, userId);
  return statements.user.get(guildId, userId);
}
function addCoins(guildId, userId, amount) { statements.addCoins.run(Math.trunc(amount), guildId, userId); }
function addXp(guildId, userId, amount) {
  statements.addXp.run(Math.max(0, Math.trunc(amount)), guildId, userId);
  const user = statements.user.get(guildId, userId);
  let level = user.level;
  let xp = user.xp;
  let leveled = 0;
  while (xp >= level * 100) { xp -= level * 100; level += 1; leveled += 1; }
  if (leveled) statements.setLevelXp.run(level, xp, guildId, userId);
  return { level, leveled };
}
function addItem(guildId, userId, itemId, quantity = 1) {
  if (quantity > 0) statements.addItem.run(guildId, userId, itemId, Math.trunc(quantity));
}
function removeItem(guildId, userId, itemId, quantity = 1) {
  return statements.removeItem.run(Math.trunc(quantity), guildId, userId, itemId, Math.trunc(quantity)).changes > 0;
}
function itemCount(guildId, userId, itemId) {
  return statements.inventory.get(guildId, userId, itemId)?.quantity || 0;
}
function cooldownRemaining(guildId, userId, action) {
  const expires = statements.cooldown.get(guildId, userId, action)?.expires_at || 0;
  return Math.max(0, expires - Date.now());
}
function setCooldown(guildId, userId, action, milliseconds) {
  statements.setCooldown.run(guildId, userId, action, Date.now() + milliseconds);
}
function addPet(guildId, userId, name, species, power, active = 0) {
  return statements.addPet.run(guildId, userId, name, species, power, active).lastInsertRowid;
}
function dailyQuests(guildId, userId, day) {
  const definitions = [
    ['hunt', 3, 80], ['fish', 2, 70], ['battle', 1, 100]
  ];
  for (const [type, target, reward] of definitions) statements.ensureQuest.run(guildId, userId, day, type, target, reward);
  return statements.quests.all(guildId, userId, day);
}
function progressQuest(guildId, userId, type, amount = 1, day = new Date().toISOString().slice(0, 10)) {
  statements.questProgress.run(amount, guildId, userId, day, type);
}

const transaction = db.transaction((guildId, userId, targetId, winnerId, loserId) => {
  const winner = statements.user.get(guildId, winnerId);
  const loser = statements.user.get(guildId, loserId);
  if (!winner || !loser) return 0;
  const wager = Math.min(50, Math.floor(loser.coins * 0.05));
  if (wager > 0) {
    statements.addCoins.run(wager, guildId, winnerId);
    statements.addCoins.run(-wager, guildId, loserId);
  }
  return wager;
});
function transferBattleCoins(guildId, winnerId, loserId) { return transaction(guildId, winnerId, loserId, winnerId, loserId); }

module.exports = {
  db, ensureUser, addCoins, addXp, addItem, removeItem, itemCount,
  inventoryList: (g, u) => statements.inventoryList.all(g, u),
  cooldownRemaining, setCooldown,
  pets: (g, u) => statements.pets.all(g, u),
  activePet: (g, u) => statements.activePet.get(g, u),
  petCount: (g, u) => statements.petCount.get(g, u).count,
  addPet,
  activatePet(g, u, id) { statements.setPetActive.run(g, u); return statements.activatePet.run(g, u, id).changes > 0; },
  grantPetXp(g, u, amount) {
    const pet = statements.activePet.get(g, u);
    if (!pet) return null;
    statements.petXp.run(amount, pet.id);
    const updated = db.prepare('SELECT * FROM pets WHERE id = ?').get(pet.id);
    let level = updated.level;
    let xp = updated.xp;
    while (xp >= level * 50) { xp -= level * 50; level += 1; }
    if (level !== updated.level) statements.petLevel.run(level, xp, pet.power + (level - pet.level), pet.id);
    return { level, leveled: level > pet.level };
  },
  leaderboard: (g) => statements.leaderboard.all(g),
  dailyQuests, progressQuest,
  claimQuest(g, u, day, type) { return statements.claimQuest.run(g, u, day, type).changes > 0; },
  claimDaily(g, u, day, streak) { statements.daily.run(day, streak, g, u); },
  transferBattleCoins
};
