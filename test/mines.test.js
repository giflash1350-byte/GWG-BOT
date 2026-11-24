import test from 'node:test';import assert from 'node:assert/strict';import {multiplier,payoutFor} from '../src/games/mines/service.js';
test('safe mines picks increase multiplier',()=>{assert.equal(multiplier(1,0),0.97);assert.ok(multiplier(1,2)>multiplier(1,1));});
test('mines payout floors whole GWG',()=>assert.equal(payoutFor(100,1.234),123));
