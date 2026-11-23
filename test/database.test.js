'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gwg-mini-test-'));
process.env.DATABASE_PATH = path.join(temp, 'test.sqlite');
const game = require('../database');
test.after(() => {
  game.db.close();
  fs.rmSync(temp, { recursive: true, force: true });
});

test('khởi tạo người chơi và gstart chỉ thưởng một lần', () => {
  const player = game.ensurePlayer('guild-test', 'user-test');
  assert.equal(player.coins, 100);
  assert.equal(player.started, 0);
  assert.equal(game.start('guild-test', 'user-test'), true);
  assert.equal(game.start('guild-test', 'user-test'), false);
});

test('giao dịch không thể làm số dư âm', () => {
  const result = game.buy('guild-test', 'user-test', 'bait', 99, 20);
  assert.equal(result.ok, false);
  assert.equal(game.getPlayer('guild-test', 'user-test').coins, 100);
  assert.equal(game.getItemCount('guild-test', 'user-test', 'bait'), 0);
});

test('mua bán cập nhật xu và vật phẩm nguyên tử', () => {
  assert.deepEqual(game.buy('guild-test', 'user-test', 'bait', 2, 20), { ok: true, cost: 40 });
  assert.equal(game.getPlayer('guild-test', 'user-test').coins, 60);
  assert.equal(game.getItemCount('guild-test', 'user-test', 'bait'), 2);
  assert.deepEqual(game.sell('guild-test', 'user-test', 'bait', 1, 8), { ok: true, earned: 8 });
  assert.equal(game.getPlayer('guild-test', 'user-test').coins, 68);
  assert.equal(game.getItemCount('guild-test', 'user-test', 'bait'), 1);
});

test('thú, XP và hồi chiêu được lưu', () => {
  game.catchAnimal('guild-test', 'user-test', { species: 'Rồng vàng', rarity: 'Huyền thoại', power: 35 });
  assert.equal(game.getBestAnimal('guild-test', 'user-test').species, 'Rồng vàng');
  assert.equal(game.addXp('guild-test', 'user-test', 100).levelsGained, 1);
  assert.equal(game.getPlayer('guild-test', 'user-test').level, 2);
  assert.equal(game.checkAndSetCooldown('guild-test', 'user-test', 'hunt', 60_000), 0);
  assert.ok(game.checkAndSetCooldown('guild-test', 'user-test', 'hunt', 60_000) > 0);
});
