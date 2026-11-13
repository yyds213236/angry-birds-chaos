const assert = require('node:assert/strict');
const test = require('node:test');

global.window = { Matter: require('../docs/matter.min.js') };
require('../docs/game.js');
const { create, levelAt, levels, world } = window.BirdGame;

const targetsAt = stage => BigInt(levelAt(stage - 1).targets);

test('the campaign starts with 3, 4, 5, 6 pigs and then doubles into endless mode', () => {
  assert.equal(levels.length, 30);
  assert.deepEqual([1, 2, 3, 4].map(targetsAt), [3n, 4n, 5n, 6n]);
  for (let stage = 5; stage <= 80; stage++) {
    assert.equal(targetsAt(stage), 2n * targetsAt(stage - 1), `stage ${stage}`);
  }
  assert.equal(targetsAt(30), 402653184n);
  assert.equal(targetsAt(31), 805306368n);
});

test('formations account for the whole population without one body per pig', () => {
  const game = create();
  for (const stage of [5, 6, 9, 30, 31, 64, 128]) {
    assert.equal(game.loadLevel(stage - 1), true);
    const state = game.getState();
    const pigs = state.entities.filter(entity => entity.kind === 'pig');
    const count = pigs.reduce((total, entity) => total + BigInt(entity.count), 0n);
    assert.equal(count, targetsAt(stage), `stage ${stage}`);
    assert.equal(BigInt(state.remainingTargets), count);
    assert.ok(pigs.length <= 24, `stage ${stage}: ${pigs.length} physical groups`);
    assert.ok(pigs.every(entity => entity.type !== 'king' || BigInt(entity.count) === 1n));
  }
});

test('endless counts stay exact after the decimal representation would become enormous', () => {
  const game = create();
  const stage = 1_000_002;
  assert.equal(game.loadLevel(stage - 1), true);
  const state = game.getState();
  assert.equal(state.remainingTargets, `3 × 2^${stage - 3}`);
  const pigs = state.entities.filter(entity => entity.kind === 'pig');
  const parts = pigs.map(({ count }) => {
    if (typeof count === 'bigint') return [0n, stage, count];
    const [, coefficient, power, sign, offset] = /^(\d+) × 2\^(\d+)(?: ([+−]) (\d+))?$/.exec(count);
    return [BigInt(coefficient), Number(power), BigInt(offset || 0) * (sign === '−' ? -1n : 1n)];
  });
  const sharedPower = Math.min(...parts.map(([, power]) => power));
  assert.equal(parts.reduce((total, [coefficient, power]) => total + (coefficient << BigInt(power - sharedPower)), 0n),
    3n << BigInt(stage - 3 - sharedPower));
  assert.equal(parts.reduce((total, [, , offset]) => total + offset, 0n), 0n);
  assert.ok(pigs.some(entity => entity.type === 'king' && entity.count === 1n));
});

test('damage reduces the population by the same amount as the formations, and a clear advances the multiplier', () => {
  let casualties = 0n;
  const game = create({ onEffect: event => {
    if (event.casualties !== undefined) casualties += BigInt(event.casualties);
  } });
  game.setModifiers({ blast: 7, impact: 3, shock: 500, extraAmmo: 3 });
  assert.equal(game.loadLevel(4), true);
  let prior = game.getState().totalTargets;
  const aim = () => {
    assert.equal(game.aim(world.sling.x - 105, world.sling.y + 26), true);
    assert.equal(game.launch(), true);
  };
  const check = () => {
    const state = game.getState();
    const current = BigInt(state.remainingTargets);
    const visible = state.entities.filter(e => e.kind === 'pig')
      .reduce((total, entity) => total + BigInt(entity.count), 0n);
    assert.equal(current, visible);
    assert.equal(current + casualties, 12n);
    assert.ok(current <= prior);
    prior = current;
    return state;
  };
  for (let shot = 0; shot < 4 && game.getState().status === 'ready'; shot++) {
    aim();
    for (let frame = 0; frame < 500; frame++) {
      if (frame === 42) game.useAbility();
      game.step(1000 / 60);
      if (check().status !== 'flying') break;
    }
  }
  assert.equal(prior, 0n);
  assert.equal(game.getState().status, 'won');
  assert.equal(game.nextLevel(), true);
  assert.equal(BigInt(game.getState().remainingTargets), 24n);
});
