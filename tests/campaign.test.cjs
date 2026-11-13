const assert = require('node:assert/strict');
const test = require('node:test');

global.window = { Matter: require('../docs/matter.min.js') };
require('../docs/game.js');
const { create, levelAt, levels, world } = window.BirdGame;

const targetsAt = stage => BigInt(levelAt(stage - 1).targets);
const pigsIn = state => state.entities.filter(entity => entity.kind === 'pig');
const fire = (game, dx, dy, skillAt, observe = () => {}) => {
  assert.ok(game.aim(world.sling.x - dx, world.sling.y + dy));
  assert.ok(game.launch());
  for (let frame = 0; frame < 520; frame++) {
    if (frame === skillAt) game.useAbility();
    game.step(1000 / 60);
    const state = game.getState();
    observe(state);
    if (state.status !== 'flying' && state.status !== 'reinforcing') return state;
  }
  return game.getState();
};

test('the campaign starts with 3, 4, 5, 6 pigs and then doubles into endless mode', () => {
  assert.equal(levels.length, 30);
  assert.deepEqual([1, 2, 3, 4].map(targetsAt), [3n, 4n, 5n, 6n]);
  for (let stage = 5; stage <= 80; stage++) {
    assert.equal(targetsAt(stage), 2n * targetsAt(stage - 1), `stage ${stage}`);
  }
  assert.equal(targetsAt(30), 402653184n);
  assert.equal(targetsAt(31), 805306368n);
});

test('each on-field pig is an individual, and the camera fits the expanded battlefield', () => {
  const game = create();
  let previousScale = 1;
  for (const stage of [4, 5, 6, 7, 8, 9, 30, 31, 64, 128]) {
    assert.equal(game.loadLevel(stage - 1), true);
    const state = game.getState();
    const pigs = pigsIn(state);
    assert.equal(pigs.length, state.activeTargets);
    assert.equal(new Set(pigs.map(pig => pig.id)).size, pigs.length);
    assert.ok(pigs.every(pig => pig.count === undefined || pig.count === 1n));
    assert.equal(BigInt(state.queuedTargets) + BigInt(pigs.length), targetsAt(stage));
    if (stage <= 8) {
      assert.equal(pigs.length, Number(targetsAt(stage)));
      assert.ok(state.camera.scale <= previousScale, `stage ${stage}: camera zoomed in`);
      previousScale = state.camera.scale;
    } else {
      assert.ok(pigs.length <= 96);
      assert.ok(state.queuedTargets > 0n);
    }
    const {scale, x, y} = state.camera;
    assert.ok(scale > 0 && scale <= 1);
    for (const pig of pigs) {
      assert.ok(pig.x * scale + x > 0 && pig.x * scale + x < world.width, `stage ${stage}: pig outside horizontally`);
      assert.ok(pig.y * scale + y > 0 && pig.y * scale + y < world.height, `stage ${stage}: pig outside vertically`);
    }
  }
  assert.ok(previousScale < 1);
});

test('TNT stays outside the pigs on crowded stages and does not spawn with reinforcements', () => {
  const game = create();
  for (let stage = 5; stage <= 36; stage++) {
    game.loadLevel(stage - 1);
    const { entities, camera } = game.getState();
    const pigs = entities.filter(entity => entity.kind === 'pig');
    const left = Math.min(...pigs.map(pig => pig.x - pig.r));
    const right = Math.max(...pigs.map(pig => pig.x + pig.r));
    const boxes = entities.filter(entity => entity.kind === 'tnt');
    assert.equal(boxes.length, levelAt(stage - 1).layout.filter(item => item.kind === 'tnt').length);
    for (const box of boxes) {
      assert.ok(box.x + box.w / 2 < left || box.x - box.w / 2 > right, `stage ${stage}: TNT inside the crowd`);
      assert.ok(Math.abs(box.y + box.h / 2 - world.groundY) < 1, `stage ${stage}: TNT off the ground`);
      assert.ok((box.x + box.w / 2) * camera.scale + camera.x < world.width, `stage ${stage}: TNT outside the camera`);
    }
  }
  game.loadLevel(8, { wave: 2n });
  assert.equal(game.getState().wave, 2n);
  assert.equal(game.getState().entities.filter(entity => entity.kind === 'tnt').length, 0);
});

test('very large endless stages still distinguish the exact population from the pigs on screen', () => {
  const game = create();
  const stage = 1_000_002;
  assert.equal(game.loadLevel(stage - 1), true);
  const state = game.getState();
  assert.equal(state.remainingTargets, `3 × 2^${stage - 3}`);
  assert.equal(state.activeTargets, pigsIn(state).length);
  assert.ok(state.activeTargets > 0 && state.activeTargets <= 96);
  assert.equal(state.queuedTargets, `3 × 2^${stage - 3} − ${state.activeTargets}`);
});

test('a pig drops when a shot destroys its raised support', () => {
  const game = create();
  assert.equal(game.loadLevel(4), true);
  for (let frame = 0; frame < 150; frame++) game.step(1000 / 60);
  const initial = game.getState();
  const raised = initial.entities.find(entity => entity.kind === 'platform' && entity.breakable && entity.x === 665);
  assert.ok(raised, 'the first raised platform is breakable');
  const pig = pigsIn(initial).find(entity => Math.abs(entity.x - raised.x) < 16 && Math.abs(entity.y + entity.r - raised.y + raised.h / 2) < 8);
  assert.ok(pig, 'a pig starts on the platform');
  assert.equal(pig.sleeping, true, 'the pig has stopped moving before the shot');
  let observedFall = false;
  fire(game, 35, 24, 24, state => {
    const falling = pigsIn(state).find(entity => entity.id === pig.id);
    if (falling && !state.entities.some(entity => entity.id === raised.id) && falling.y > pig.y + 35 && falling.vy > 1.2) {
      observedFall = true;
    }
  });
  assert.ok(observedFall, 'the same living pig falls below the missing platform under gravity');
});

test('reinforcements each spawn as real pigs and retry restores only the current wave', () => {
  const deaths = [];
  const game = create({onEffect: event => { if (event.type === 'pig') deaths.push(event.casualties); }});
  game.setModifiers({blast: 12, impact: 10, shock: 620, extraAmmo: 6});
  assert.equal(game.loadLevel(8), true);
  assert.equal(game.getState().wave, 1n);
  const next = fire(game, 105, 26, 38);
  assert.equal(next.wave, 2n);
  assert.equal(next.activeTargets, 96);
  assert.equal(next.queuedTargets, 0n);
  assert.equal(next.remainingTargets, 96n);
  assert.equal(deaths.length, 96);
  assert.ok(next.ammoCount > 0);
  assert.equal(game.retryWave(), true);
  assert.equal(game.getState().wave, 2n);
  assert.equal(game.getState().clearedTargets, 96n);
  assert.equal(game.loadLevel(8, next.checkpoint), true);
  assert.equal(game.getState().remainingTargets, 96n);
  assert.equal(fire(game, 105, 26, 38).status, 'won');
  assert.equal(deaths.length, 192);
  assert.ok(deaths.every(count => count === 1n));
  assert.equal(game.nextLevel(), true);
  assert.equal(game.getState().totalTargets, 384n);
});
