/* Slingshot levels and Matter.js simulation, in logical scene coordinates. */
(() => {
  'use strict';

  const world = Object.freeze({
    width: 1280, height: 600, groundY: 505, sling: Object.freeze({ x: 206, y: 388 }), maxPull: 128,
  });
  const birds = Object.freeze({
    red: Object.freeze({ name: '红鸟', ability: '重击', description: '空中触发冲击，强化下一次碰撞。', radius: 23, color: '#ff6255' }),
    yellow: Object.freeze({ name: '黄鸟', ability: '加速', description: '沿当前方向猛冲，砸穿掩体。', radius: 22, color: '#ffc64d' }),
    blue: Object.freeze({ name: '蓝鸟', ability: '分裂', description: '空中分成多只小鸟，扩大命中范围。', radius: 21, color: '#57caef' }),
    black: Object.freeze({ name: '黑鸟', ability: '引爆', description: '引爆周围的方块和 TNT。', radius: 25, color: '#34324a' }),
  });
  const materials = Object.freeze({
    wood: { hp: 46, density: 0.0017, score: 120 },
    glass: { hp: 27, density: 0.0013, score: 140 },
    stone: { hp: 88, density: 0.0032, score: 170 },
  });
  const pigTypes = Object.freeze({
    green: Object.freeze({ name: '普通猪', hp: 34, density: 0.0018, score: 500, shield: 0, recoil: 1 }),
    armored: Object.freeze({ name: '铁盔猪', hp: 67, density: 0.0027, score: 650, shield: 0, recoil: 0.82 }),
    shield: Object.freeze({ name: '护盾猪', hp: 42, density: 0.0022, score: 750, shield: 56, recoil: 0.75 }),
    king: Object.freeze({ name: '猪王', hp: 246, density: 0.0042, score: 1550, shield: 0, recoil: 0.66 }),
  });
  const modifiersBase = Object.freeze({ power: 1, blast: 1, impact: 1, split: 0, extraAmmo: 0, score: 1, shock: 0 });
  const stepMs = 1000 / 120;
  const gravity = 1;
  const air = 0.003;
  const launchScale = 0.232;
  const G = world.groundY;
  const maxLaunchSpeed = 50;
  const maxFragments = 13;
  const rewards = ['black', 'blue', 'yellow', 'red'];

  const block = (x, y, w, h, type = 'wood') => ({ kind: 'block', type, x, y, w, h });
  const pig = (x, y, r = 23, type = 'green') => ({ kind: 'pig', type, x, y, r });
  const tnt = (x, y, size = 42) => ({ kind: 'tnt', type: 'tnt', x, y, w: size, h: size });
  const platform = (x, y, w, h = 20) => ({ kind: 'platform', type: 'stone', x, y, w, h });

  function frame(x, floor, width = 132, height = 90, type = 'wood', top = type) {
    const post = 24;
    return [
      block(x - width / 2 + post / 2, floor - height / 2, post, height, type),
      block(x + width / 2 - post / 2, floor - height / 2, post, height, type),
      block(x, floor - height - 11, width + 14, 22, top),
    ];
  }

  function level(name, theme, ammo, description, layout, par, rating, id = theme, region = 0) {
    return Object.freeze({
      id, name, theme, region, rating, ammo: Object.freeze(ammo), description, par,
      boss: layout.some(item => item.type === 'king'),
      targets: layout.filter(item => item.kind === 'pig').length,
      layout: Object.freeze(layout.map(item => Object.freeze(item))),
    });
  }

  const openingLevels = [
    level('暖场爆破', 'garden', ['red', 'yellow', 'black', 'blue'], '先把弹弓往后拉。命中塔脚的 TNT，就能掀翻整座木塔。', [
      ...frame(840, G, 142, 88),
      ...frame(840, G - 110, 106, 69, 'glass', 'wood'),
      pig(840, G - 23),
      pig(839, G - 133),
      pig(840, G - 224),
      tnt(744, G - 21),
      tnt(950, G - 21),
      block(1030, G - 12, 92, 24),
    ], 1, 1),
    level('玻璃双塔', 'woodland', ['blue', 'red', 'black', 'yellow'], '蓝鸟在空中分裂，可以同时扫过两座玻璃塔。', [
      ...frame(742, G, 114, 98, 'glass', 'wood'),
      ...frame(742, G - 120, 84, 56, 'glass'),
      ...frame(982, G, 136, 119, 'glass', 'stone'),
      pig(742, G - 23),
      pig(741, G - 143),
      pig(981, G - 23),
      pig(982, G - 164),
      tnt(856, G - 21),
    ], 2, 2),
    level('采石场伏击', 'quarry', ['yellow', 'black', 'red', 'black', 'blue', 'yellow'], '朝石墙前的 TNT 发射。黄鸟空中加速也能砸穿石柱。', [
      ...frame(753, G, 128, 90, 'stone', 'wood'),
      ...frame(950, G, 157, 126, 'wood', 'stone'),
      ...frame(950, G - 148, 105, 70, 'glass', 'wood'),
      pig(753, G - 23),
      pig(753, G - 135),
      pig(950, G - 23),
      pig(950, G - 171),
      pig(950, G - 263, 22),
      tnt(655, G - 21),
      tnt(824, G - 21),
      tnt(985, G - 169),
    ], 2, 3),
    level('火药仓库', 'industrial', ['black', 'yellow', 'blue', 'red', 'black'], '护盾猪会先消耗护盾。三座仓库各自设防，留几发给后排。', [
      ...frame(660, G, 117, 85, 'wood', 'stone'),
      ...frame(894, G, 141, 117, 'stone', 'stone'),
      ...frame(1090, G, 124, 102, 'stone', 'wood'),
      pig(659, G - 23),
      pig(660, G - 130),
      pig(894, G - 24, 24, 'shield'),
      pig(894, G - 164, 25, 'armored'),
      pig(1090, G - 24, 24, 'shield'),
      pig(1090, G - 149, 25, 'armored'),
      tnt(568, G - 21),
      tnt(1179, G - 21),
    ], 3, 4),
    level('空中据点', 'sky', ['blue', 'yellow', 'black', 'black', 'red', 'blue'], '平台把目标分在三个高度。瞄准后排时拉出更高的弧线，靠近护盾再放技能。', [
      platform(665, 422, 166, 22),
      platform(903, 312, 178, 20),
      platform(1131, 382, 178, 22),
      ...frame(665, 411, 113, 74, 'glass', 'wood'),
      ...frame(903, 302, 122, 83, 'stone', 'wood'),
      ...frame(1131, 371, 112, 80, 'wood', 'stone'),
      pig(665, 387, 24, 'shield'),
      pig(665, 292),
      pig(903, 277, 25, 'armored'),
      pig(1131, 347, 24, 'shield'),
      pig(1131, 244, 25, 'armored'),
      pig(837, G - 23),
      tnt(723, 390),
      tnt(1179, 350),
    ], 4, 5),
    level('猪王要塞', 'fortress', ['black', 'blue', 'yellow', 'red', 'black', 'yellow'], '猪王半血会震开身边的小鸟。打穿防线，留下一只黑鸟处理第二阶段。', [
      ...frame(634, G, 118, 92, 'stone', 'stone'),
      ...frame(880, G, 180, 124, 'stone', 'stone'),
      ...frame(880, G - 146, 146, 104, 'wood', 'stone'),
      ...frame(880, G - 272, 106, 67, 'glass', 'wood'),
      ...frame(1107, G, 128, 103, 'stone', 'stone'),
      pig(634, G - 24, 24, 'shield'),
      pig(634, G - 139, 25, 'armored'),
      pig(880, G - 33, 33, 'king'),
      pig(880, G - 171, 25, 'armored'),
      pig(880, G - 296, 24, 'shield'),
      pig(880, G - 384, 21),
      pig(1107, G - 24, 24, 'shield'),
      pig(1107, G - 150, 25, 'armored'),
      tnt(540, G - 21),
      tnt(1205, G - 21),
    ], 4, 6),
  ];

  const sectors = [
    {
      name: '余烬矿区', theme: 'quarry',
      missions: ['挡风矿棚', '深井运台', '三叉矿道', '高架卸料场', '封矿防线', '矿主堡垒'],
      shifts: [-20, 10, -12, 16, 8, 0],
    },
    {
      name: '高空运输线', theme: 'sky',
      missions: ['断索升降站', '悬梁前哨', '双轨集散地', '高塔转运口', '护盾机库', '空运司令塔'],
      shifts: [11, -15, 20, -8, 16, -10],
    },
    {
      name: '铁炉工区', theme: 'industrial',
      missions: ['熔炉守门营', '连廊工事', '电机货栈', '钢索仓道', '冷却中枢', '铸铁要塞'],
      shifts: [-7, 22, 5, -13, 11, 16],
    },
    {
      name: '猪王禁区', theme: 'fortress',
      missions: ['外环拦截阵', '空堡三重门', '盾墙中庭', '禁卫空桥', '王座前线', '猪王终极堡'],
      shifts: [20, -7, -19, 9, -12, 0],
    },
  ];

  function guard(x, floor, type = 'green') {
    const radius = { green: 23, armored: 25, shield: 24, king: 33 }[type];
    return pig(x, floor - radius, radius, type);
  }

  function outpost(x, floor, options = {}) {
    const { width = 122, height = 87, wall = 'stone', roof = 'wood', base = 'shield', lookout = 'armored' } = options;
    return [
      ...frame(x, floor, width, height, wall, roof),
      guard(x, floor, base),
      guard(x, floor - height - 22, lookout),
    ];
  }

  function ridge(x, floor, width) {
    return platform(x, floor + 11, width, 22);
  }

  // The shifts and alternating high routes vary firing lines while each module
  // retains a clear approach and consistent contact with its ground or ledge.
  function missionLayout(route, region, shift) {
    const low = 639 + shift;
    const middle = 884 - shift;
    const far = 1102 + Math.round(shift / 2);
    const rise = region % 2 ? 23 : 0;
    const upper = region > 1 ? 'armored' : 'green';
    const lower = region > 1 ? 'shield' : 'armored';
    switch (route) {
      case 0:
        return [
          ...outpost(low, G, { height: 84 + rise, wall: 'wood', roof: 'stone', base: 'armored' }),
          ...outpost(middle, G, { height: 106, width: 128, lookout: 'shield' }),
          ridge(far, 340 - rise, 150),
          ...outpost(far, 340 - rise, { height: 81, width: 106, wall: 'glass', base: 'shield', lookout: upper }),
          tnt(low - 85, G - 21),
        ];
      case 1:
        return [
          ridge(low, 401 - rise, 165),
          ...outpost(low, 401 - rise, { height: 78, wall: 'glass', base: lower, lookout: 'green' }),
          ridge(middle, 274 + rise, 153),
          ...outpost(middle, 274 + rise, { height: 73, width: 107, wall: 'wood', lookout: 'armored' }),
          ...outpost(far, G, { height: 105, roof: 'stone', lookout: 'shield' }),
          guard(middle + 2, G, 'armored'),
          tnt(far + 83, G - 21),
        ];
      case 2:
        return [
          ...outpost(low, G, { height: 98 + rise, width: 136, roof: 'stone', base: 'armored', lookout: 'shield' }),
          ...frame(middle, G, 144, 101, 'stone', 'stone'),
          ...outpost(middle, G - 123, { height: 72, width: 118, wall: 'wood', base: lower, lookout: 'armored' }),
          guard(middle, G, 'shield'),
          ...outpost(far, G, { height: 101 - rise, width: 122, base: 'shield', lookout: upper }),
          tnt(low - 87, G - 21),
          tnt(far + 84, G - 21),
        ];
      case 3:
        return [
          ridge(low, 316 + rise, 163),
          ...outpost(low, 316 + rise, { height: 69, width: 111, wall: 'glass', base: 'shield', lookout: upper }),
          ...outpost(middle, G, { height: 107, width: 122, base: lower, lookout: 'shield' }),
          ridge(far, 371 - rise, 161),
          ...outpost(far, 371 - rise, { height: 77, width: 118, base: 'shield', lookout: 'armored' }),
          guard(low + 42, G, 'armored'),
          tnt(far + 71, 350 - rise),
        ];
      case 4:
        return [
          ...outpost(low, G, { height: 117, width: 128, roof: 'stone', base: 'shield', lookout: 'armored' }),
          ridge(middle, 311 - rise, 162),
          ...outpost(middle, 311 - rise, { height: 83, width: 105, wall: 'wood', lookout: 'shield' }),
          ...outpost(far, G, { height: 101, width: 136, roof: 'stone', base: 'shield', lookout: 'armored' }),
          guard(middle, G, lower),
          tnt(low - 86, G - 21),
          tnt(far + 86, G - 21),
        ];
      default: {
        const final = region === 4;
        const king = { ...guard(middle, G, 'king'), bonusHp: final ? 86 : 18 * region };
        return [
          ...outpost(low, G, { height: 100 + rise, width: 126, roof: 'stone', lookout: 'armored' }),
          ...frame(middle, G, 174, 127, 'stone', 'stone'),
          ...outpost(middle, G - 149, { height: 91, width: 144, wall: 'wood', roof: 'stone', lookout: 'shield' }),
          king,
          ridge(far, final ? 318 : 365 - rise, 157),
          ...outpost(far, final ? 318 : 365 - rise, { height: 75, width: 109, roof: 'stone', lookout: 'armored' }),
          guard(far, G, final ? 'shield' : 'armored'),
          tnt(low - 89, G - 21),
          tnt(far + 64, G - 21),
        ];
      }
    }
  }

  const routeHints = [
    '先处理地面的哨塔，再瞄准高处的护盾猪。',
    '中间平台位置最高，用抬高的弹道越过前排。',
    '石墙挡住了通路，用黄鸟撞开，再引爆两侧火药。',
    '高低两个方向都设防，把黑鸟留给护盾最多的地方。',
    '两座地面塔之间还有空中岗哨，分别瞄准三处守军。',
    '打倒禁卫后瞄准堡内的猪王，它半血时会震开周围的小鸟。',
  ];
  const routeAmmo = [
    ['yellow', 'black', 'blue', 'red', 'black', 'yellow'],
    ['blue', 'black', 'yellow', 'black', 'red', 'blue'],
    ['black', 'yellow', 'red', 'black', 'blue', 'black'],
    ['blue', 'yellow', 'black', 'black', 'red', 'yellow'],
    ['yellow', 'blue', 'black', 'red', 'black', 'blue'],
    ['black', 'blue', 'yellow', 'black', 'red', 'black', 'yellow'],
  ];

  const advancedLevels = sectors.flatMap((sector, i) => {
    const region = i + 1;
    return sector.missions.map((name, route) => {
      const ammo = [...routeAmmo[route]];
      if (route < 5 && region > 2) [ammo[0], ammo[1]] = [ammo[1], ammo[0]];
      return level(name, sector.theme, ammo, routeHints[route], missionLayout(route, region, sector.shifts[route]),
        route === 5 ? 4 : 3, 7 + i * 6 + route, 'stage-' + (7 + i * 6 + route), region);
    });
  });
  function baseDurability(layout) {
    return layout.reduce((total, item) => {
      if (item.kind !== 'pig') return total;
      const variant = pigTypes[item.type];
      const armor = item.type === 'king' ? 1.42 : item.type === 'armored' ? 1.28 : 1;
      return total + (variant.hp + (item.bonusHp || 0)) * armor + variant.shield;
    }, 0);
  }

  let lastDurability = 0;
  const levels = Object.freeze([...openingLevels, ...advancedLevels].map((entry, index) => {
    const base = baseDurability(entry.layout);
    const nominal = base * (1 + Math.max(0, index - 3) * 0.014);
    const durability = index < 3 ? base : Math.max(nominal, lastDurability * 1.016);
    lastDurability = durability;
    return Object.freeze({ ...entry, durability, defense: durability / base });
  }));

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const modifier = (value, fallback, min) => Number.isFinite(value) ? Math.max(min, value) : fallback;
  const scaleToNumber = number => Math.min(Number.MAX_VALUE, number);

  function levelAt(index) {
    if (!Number.isSafeInteger(index) || index < 0) return undefined;
    if (index < levels.length) return levels[index];
    const endlessIndex = index - levels.length;
    const chapter = Math.floor(endlessIndex / 6);
    const route = endlessIndex % 6;
    const region = chapter % sectors.length + 1;
    const sector = sectors[region - 1];
    const shift = (index * 13 % 41) - 20;
    const title = sector.missions[route] + ' · 无尽 ' + (chapter + 1);
    const hint = routeHints[route] + ' 无尽关卡的护甲会继续变厚。';
    const layout = missionLayout(route, region, shift);
    const entry = level(title, sector.theme, [...routeAmmo[route]], hint, layout,
      route === 5 ? 5 : 4, index + 1, 'endless-' + (endlessIndex + 1), region);
    const durability = lastDurability + (endlessIndex + 1) * 32;
    return Object.freeze({ ...entry, durability, defense: durability / baseDurability(layout) });
  }

  function create({ onChange = () => {}, onEffect = () => {} } = {}) {
    const { Engine, Bodies, Body, Composite, Events, Sleeping } = window.Matter;
    let engine;
    let bodies = new Map();
    let motion = new Map();
    let queue = [];
    let reserveAmmo = 0;
    let reserveIndex = 0;
    let currentLevel = levels[0];
    let impacts = [];
    let blasts = [];
    let index = 0;
    let status = 'ready';
    let unlimited = false;
    let modifiers = { ...modifiersBase };
    let aimPoint = null;
    let preview = [];
    let primary = null;
    let birdType = null;
    let abilityUsed = false;
    let score = 0;
    let remainingTargets = 0;
    let shots = 0;
    let stars = 0;
    let combo = 0;
    let shotElapsed = 0;
    let inactivity = 0;
    let winElapsed = 0;
    let accumulator = 0;
    let changed = false;
    let nextEntityId = 1;
    let previousHit = -Infinity;

    function effect(type, x = world.sling.x, y = world.sling.y, extra = {}) {
      onEffect({ type, x, y, ...extra });
    }

    function ammoCount() {
      return queue.length + reserveAmmo;
    }

    function previewAmmo() {
      const ammo = [...queue];
      const length = Math.min(Math.max(0, 8 - ammo.length), reserveAmmo);
      for (let i = 0; i < length; i++) ammo.push(rewards[(reserveIndex + i) % rewards.length]);
      return ammo;
    }

    function takeBird() {
      if (queue.length) return queue.shift();
      if (!reserveAmmo) return null;
      reserveAmmo -= 1;
      const type = rewards[reserveIndex];
      reserveIndex = (reserveIndex + 1) % rewards.length;
      return type;
    }

    function getState() {
      const ammo = previewAmmo();
      return {
        levelIndex: index, level: currentLevel, status, score, remainingTargets, totalTargets: currentLevel.targets,
        ammo, ammoCount: ammoCount(), activeBirdType: status === 'flying' ? birdType : ammo[0] || null, abilityUsed,
        sling: world.sling, aim: aimPoint && { ...aimPoint }, trajectory: preview,
        unlimited, shots, stars, combo, shotElapsed, modifiers: { ...modifiers },
        entities: [...bodies.values()].map(body => {
          const data = body.plugin.birdGame;
          return {
            id: data.id, kind: data.kind, type: data.type, x: body.position.x, y: body.position.y,
            angle: body.angle, w: data.w, h: data.h, r: data.r, hp: data.hp, maxHp: data.maxHp,
            vx: body.velocity.x, vy: body.velocity.y,
            phase: data.phase, shieldHp: data.shieldHp, shieldMaxHp: data.shieldMaxHp,
            ...(data.kind === 'pig' ? { name: pigTypes[data.type].name } : {}),
          };
        }),
      };
    }

    function publish() {
      changed = false;
      onChange(getState());
    }

    function createBody(item, primaryBird = false) {
      const bodyMaterial = materials[item.type];
      const bird = item.kind === 'bird';
      const pigType = item.kind === 'pig' ? pigTypes[item.type] : null;
      const staticBody = item.kind === 'platform';
      const baseHp = !staticBody ? bodyMaterial?.hp ?? pigType?.hp ?? (item.kind === 'tnt' ? 18 : Infinity) : Infinity;
      const defense = pigType ? currentLevel.defense : 1;
      const hp = (baseHp + (item.bonusHp || 0)) * defense;
      const shieldHp = (pigType?.shield ?? 0) * defense;
      const options = {
        isStatic: staticBody,
        density: bodyMaterial?.density ?? (pigType ? pigType.density * Math.min(1.65, Math.sqrt(1 + Math.max(0, index - 3) * 0.014)) : bird ? 0.0046 : 0.002),
        friction: bird ? 0.40 : 0.64,
        frictionStatic: 0.85,
        frictionAir: bird ? air : 0.014,
        restitution: bird ? 0.36 : item.kind === 'pig' ? 0.18 : 0.055,
        sleepThreshold: 44,
      };
      const body = item.r
        ? Bodies.circle(item.x, item.y, item.r, options, 32)
        : Bodies.rectangle(item.x, item.y, item.w, item.h, options);
      body.plugin.birdGame = {
        id: nextEntityId++, ...item, hp, maxHp: hp, primary: primaryBird,
        shockSpent: false, redBoost: false, bombAge: null,
        phase: 1, shieldHp, shieldMaxHp: shieldHp, guardAt: -Infinity, rageUntil: 0,
      };
      bodies.set(body.id, body);
      Composite.add(engine.world, body);
      return body;
    }

    function removeBody(body) {
      Composite.remove(engine.world, body);
      bodies.delete(body.id);
    }

    function points(value) {
      score = scaleToNumber(score + Math.round(value * modifiers.score));
      changed = true;
    }

    function destroy(body) {
      const data = body.plugin.birdGame;
      if (!bodies.has(body.id)) return;
      const { x, y } = body.position;
      removeBody(body);
      if (data.kind === 'pig') {
        remainingTargets -= 1;
        combo += 1;
        const bonus = Math.min(combo - 1, 5) * 110;
        const gained = pigTypes[data.type].score + bonus;
        points(gained);
        effect('pig', x, y, { score: scaleToNumber(Math.round(gained * modifiers.score)), combo, material: 'pig', pigType: data.type });
        return;
      }
      if (data.kind === 'tnt') {
        points(240);
        blasts.push({ x, y, radius: 210, force: 1.05, material: 'tnt' });
        return;
      }
      if (data.kind === 'block') {
        points(materials[data.type].score);
        effect('break', x, y, { material: data.type, strength: 0.85, score: scaleToNumber(Math.round(materials[data.type].score * modifiers.score)) });
      }
    }

    function pigEffect(type, body, strength, radius) {
      const data = body.plugin.birdGame;
      effect(type, body.position.x, body.position.y, { material: 'pig', pigType: data.type, strength, radius });
    }

    function enterRage(king) {
      const data = king.plugin.birdGame;
      data.phase = 2;
      data.rageUntil = engine.timing.timestamp + 325;
      data.hp = Math.max(data.hp, data.maxHp * 0.44);
      const radius = 156;
      pigEffect('rage', king, 1, radius);
      for (const bird of bodies.values()) {
        if (bird.plugin.birdGame.kind !== 'bird') continue;
        const dx = bird.position.x - king.position.x;
        const dy = bird.position.y - king.position.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= radius) continue;
        const impulse = 21 * (1 - distance / radius);
        const unitX = dx / Math.max(10, distance);
        Body.setVelocity(bird, { x: bird.velocity.x * 0.72 + unitX * impulse, y: bird.velocity.y - impulse * 0.65 });
      }
    }

    function damage(body, amount, source = 'impact') {
      const data = body.plugin.birdGame;
      if (!data || data.hp === Infinity || amount <= 0 || !bodies.has(body.id)) return;
      const pig = data.kind === 'pig';
      const timestamp = engine.timing.timestamp;
      if (data.rageUntil > timestamp) return;
      const armored = data.type === 'armored' && data.hp > data.maxHp * 0.5;
      const king = data.type === 'king' && data.phase === 1;
      if (armored || king) {
        amount *= source === 'blast' ? 0.83 : 0.62;
      }
      if (data.shieldHp > 0) {
        const absorbed = Math.min(data.shieldHp, amount * 0.92);
        data.shieldHp -= absorbed;
        amount -= absorbed;
        if (data.shieldHp <= 0) {
          pigEffect('armorBreak', body, 0.94);
        } else if (absorbed > 7 && timestamp - data.guardAt > 125) {
          data.guardAt = timestamp;
          pigEffect('guard', body, 0.7);
        }
      }
      data.hp -= amount;
      if (pig && data.type !== 'green') changed = true;
      if (king && data.hp <= data.maxHp * 0.5) enterRage(body);
      if (armored && data.hp <= data.maxHp * 0.5 && data.hp > 0) pigEffect('armorBreak', body, 0.8);
      if (data.hp <= 0) destroy(body);
    }

    function nearestDistance(body, x, y) {
      const data = body.plugin.birdGame;
      const dx = x - body.position.x;
      const dy = y - body.position.y;
      if (data.r) return Math.max(0, Math.hypot(dx, dy) - data.r);
      const cos = Math.cos(body.angle);
      const sin = Math.sin(body.angle);
      const outsideX = Math.max(0, Math.abs(cos * dx + sin * dy) - data.w / 2);
      const outsideY = Math.max(0, Math.abs(-sin * dx + cos * dy) - data.h / 2);
      return Math.hypot(outsideX, outsideY);
    }

    function processBlasts() {
      while (blasts.length) {
        const { x, y, force, material, birdType: sourceBird, radius: baseRadius, damageScale = 1 } = blasts.shift();
        const radius = scaleToNumber(baseRadius * modifiers.blast);
        effect('blast', x, y, { material, birdType: sourceBird, radius, strength: force, combo });
        for (const body of [...bodies.values()]) {
          if (body.isStatic) continue;
          const dist = nearestDistance(body, x, y);
          if (dist >= radius) continue;
          const falloff = Math.pow(1 - dist / radius, 0.72);
          const dx = body.position.x - x;
          const dy = body.position.y - y;
          const norm = Math.max(12, Math.hypot(dx, dy));
          const impulse = Math.min(70, 26 * force * falloff * Math.sqrt(modifiers.blast));
          const data = body.plugin.birdGame;
          const recoil = data.kind === 'pig' ? pigTypes[data.type].recoil : 1;
          const massScale = clamp(2.8 / body.mass, 0.34, 1.65) * recoil;
          Sleeping.set(body, false);
          Body.setVelocity(body, {
            x: body.velocity.x + dx / norm * impulse * massScale,
            y: body.velocity.y + (dy / norm - 0.58) * impulse * massScale,
          });
          Body.setAngularVelocity(body, body.angularVelocity + clamp(dx / 180, -1, 1) * 0.32 * falloff * force);
          damage(body, (data.kind === 'tnt' ? 100 : data.kind === 'pig' ? 117 : 119) * falloff * force * Math.sqrt(modifiers.impact) * damageScale, 'blast');
        }
      }
    }

    function collisionSpeed(first, second, normal) {
      const a = motion.get(first.id) || first.velocity;
      const b = motion.get(second.id) || second.velocity;
      const relative = { x: a.x - b.x, y: a.y - b.y };
      return Math.max(Math.abs(relative.x * normal.x + relative.y * normal.y), Math.hypot(relative.x, relative.y) * 0.36);
    }

    function processImpacts() {
      for (const pair of impacts) {
        const a = pair.bodyA.parent;
        const b = pair.bodyB.parent;
        const dataA = a.plugin.birdGame;
        const dataB = b.plugin.birdGame;
        if ((dataA && !bodies.has(a.id)) || (dataB && !bodies.has(b.id))) continue;
        const speed = collisionSpeed(a, b, pair.collision.normal);
        if (speed < 2.7) continue;
        const origin = dataA?.kind === 'bird' ? a : dataB?.kind === 'bird' ? b : null;
        const bird = origin?.plugin.birdGame;
        const victim = origin === a ? dataB : dataA;
        const x = (a.position.x + b.position.x) / 2;
        const y = (a.position.y + b.position.y) / 2;
        if (origin && bird.primary && !bird.shockSpent && modifiers.shock > 0) {
          bird.shockSpent = true;
          blasts.push({ x: origin.position.x, y: origin.position.y, radius: modifiers.shock, force: 0.7, birdType: bird.type });
        }
        if (origin && bird.type === 'black' && bird.primary && bird.bombAge === null && !abilityUsed) bird.bombAge = shotElapsed;
        if (origin && (speed > 5 || victim?.kind === 'tnt') && shotElapsed - previousHit > 80) {
          previousHit = shotElapsed;
          effect('hit', origin.position.x, origin.position.y, {
            material: victim?.kind === 'pig' ? 'pig' : victim?.type || 'ground', birdType: bird.type, strength: clamp(speed / 28, 0.18, 1),
          });
        }
        for (const [body, source] of [[a, b], [b, a]]) {
          const data = body.plugin.birdGame;
          if (!data || data.hp === Infinity) continue;
          const from = source.plugin.birdGame;
          const birdHit = from?.kind === 'bird';
          if (birdHit) {
            const directPower = (from.redBoost ? 2.25 : from.type === 'yellow' && abilityUsed ? 1.55 : 1) * (from.hitBoost || 1);
            damage(body, speed * (data.kind === 'pig' ? 4.5 : 3.05) * directPower * modifiers.impact);
            continue;
          }
          if (data.kind === 'tnt') {
            damage(body, Math.max(0, speed - 2) * 5.4);
          } else if (from?.kind === 'block' || from?.kind === 'pig' || source.isStatic) {
            const mass = source.isStatic ? body.mass : source.mass;
            damage(body, Math.max(0, speed - 2.8) * clamp(mass, 0.65, 5) * (data.kind === 'pig' ? 2.5 : 1.5));
          }
        }
        if (bird?.redBoost && victim) {
          bird.redBoost = false;
          blasts.push({ x, y, radius: 98, force: 0.58, birdType: 'red' });
        }
      }
      impacts.length = 0;
    }

    function launchVector(point) {
      const x = (world.sling.x - point.x) * launchScale;
      const y = (world.sling.y - point.y) * launchScale;
      const distance = Math.hypot(x, y);
      const flightPower = distance > 0 ? Math.min(modifiers.power, maxLaunchSpeed / distance) : 1;
      return { x: x * flightPower, y: y * flightPower, hitBoost: Math.max(1, modifiers.power / flightPower) };
    }

    function trajectoryFor(point) {
      const velocity = launchVector(point);
      const points = [];
      let { x, y } = point;
      let vx = velocity.x / 2;
      let vy = velocity.y / 2;
      for (let i = 0; i < 180; i++) {
        vx *= 1 - air / 2;
        vy = vy * (1 - air / 2) + gravity * 0.001 * stepMs * stepMs;
        x += vx;
        y += vy;
        if (y > G - 18 || x > world.width || x < -15) break;
        if (i % 6 === 5 && y >= 12) points.push({ x, y });
      }
      return points;
    }

    function aim(x, y) {
      if ((status !== 'ready' && status !== 'aiming') || !ammoCount() || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      const dx = Math.min(0, x - world.sling.x);
      const dy = y - world.sling.y;
      const ratio = Math.min(1, world.maxPull / Math.max(1, Math.hypot(dx, dy)));
      aimPoint = { x: world.sling.x + dx * ratio, y: world.sling.y + dy * ratio };
      preview = trajectoryFor(aimPoint);
      if (status !== 'aiming') {
        status = 'aiming';
        publish();
      }
      return true;
    }

    function cancelAim() {
      if (status !== 'aiming') return false;
      status = 'ready';
      aimPoint = null;
      preview = [];
      publish();
      return true;
    }

    function launch() {
      if (status !== 'aiming' || !aimPoint || !ammoCount()) return false;
      if (Math.hypot(world.sling.x - aimPoint.x, world.sling.y - aimPoint.y) < 14 || world.sling.x - aimPoint.x < 9) {
        cancelAim();
        return false;
      }
      const { x, y } = aimPoint;
      const velocity = launchVector(aimPoint);
      birdType = takeBird();
      if (unlimited && !ammoCount()) queue.push(...currentLevel.ammo);
      const { radius } = birds[birdType];
      primary = createBody({ kind: 'bird', type: birdType, x, y, r: radius, hitBoost: velocity.hitBoost }, true);
      Body.setVelocity(primary, velocity);
      Body.setAngularVelocity(primary, 0.09);
      status = 'flying';
      aimPoint = null;
      preview = [];
      abilityUsed = false;
      shotElapsed = 0;
      inactivity = 0;
      winElapsed = 0;
      previousHit = -Infinity;
      combo = 0;
      shots += 1;
      effect('launch', x, y, { birdType, strength: clamp(Math.hypot(velocity.x, velocity.y) / 35, 0.15, 1) });
      publish();
      return true;
    }

    function bomb() {
      if (!primary || !bodies.has(primary.id)) return;
      const { x, y } = primary.position;
      const hitBoost = primary.plugin.birdGame.hitBoost || 1;
      removeBody(primary);
      primary = null;
      abilityUsed = true;
      blasts.push({ x, y, radius: 220, force: 1.12, damageScale: hitBoost, birdType: 'black' });
    }

    function useAbility() {
      if (status !== 'flying' || abilityUsed || !primary || !bodies.has(primary.id) || shotElapsed > 6800) return false;
      const { x, y } = primary.position;
      const velocity = Body.getVelocity(primary);
      const direction = Math.atan2(velocity.y, Math.max(1, velocity.x));
      if (birdType === 'black') {
        bomb();
        processBlasts();
      } else if (birdType === 'blue') {
        const intendedCount = 3 + modifiers.split;
        const count = Math.min(maxFragments, intendedCount);
        const spread = Math.min(0.48, 0.28 + modifiers.split * 0.035);
        const speed = Math.min(54, Math.max(12, Math.hypot(velocity.x, velocity.y)) * 1.08);
        const hitBoost = scaleToNumber((primary.plugin.birdGame.hitBoost || 1) * intendedCount / count);
        removeBody(primary);
        primary = null;
        for (let i = 0; i < count; i++) {
          const gap = i / (count - 1) * 2 - 1;
          const angle = direction + gap * spread;
          const offset = gap * (count - 1) * 8;
          const fragment = createBody({ kind: 'bird', type: 'blue', x: x - Math.sin(direction) * offset, y: y + Math.cos(direction) * offset, r: 12, hitBoost });
          Body.setVelocity(fragment, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
          Body.setAngularVelocity(fragment, gap * 0.22);
        }
      } else if (birdType === 'yellow') {
        const speed = Math.min(64, Math.max(23, Math.hypot(velocity.x, velocity.y) * 1.68));
        Body.setVelocity(primary, { x: Math.cos(direction) * speed, y: Math.sin(direction) * speed });
      } else {
        primary.plugin.birdGame.redBoost = true;
        const speed = Math.min(51, Math.max(17, Math.hypot(velocity.x, velocity.y) * 1.28));
        Body.setVelocity(primary, { x: Math.cos(direction) * speed, y: Math.sin(direction) * speed });
      }
      abilityUsed = true;
      if (birdType !== 'black') effect('ability', x, y, { birdType, strength: 0.9 });
      publish();
      return true;
    }

    function finish(won) {
      status = won ? 'won' : 'lost';
      if (won) {
        const { par } = currentLevel;
        stars = shots <= par ? 3 : shots <= par + 1 ? 2 : 1;
        points(ammoCount() * 150);
      }
      effect(won ? 'win' : 'loss', world.width / 2, 238, { score, combo, stars });
      changed = true;
    }

    function advanceShot() {
      shotElapsed += stepMs;
      for (const body of [...bodies.values()]) {
        if (body.isStatic) continue;
        if (body.position.x < -160 || body.position.x > world.width + 160 || body.position.y > world.height + 160) {
          if (body.plugin.birdGame.kind === 'bird') removeBody(body);
          else if (body.plugin.birdGame.kind === 'pig') destroy(body);
          else removeBody(body);
        }
      }
      const primaryData = primary?.plugin.birdGame;
      if (Number.isFinite(primaryData?.bombAge) && shotElapsed - primaryData.bombAge >= 260) {
        bomb();
        processBlasts();
      }
      if (remainingTargets === 0) {
        winElapsed += stepMs;
        if (winElapsed >= 610) finish(true);
        return;
      }
      const movingBird = [...bodies.values()].some(body => body.plugin.birdGame.kind === 'bird' && Math.hypot(body.velocity.x, body.velocity.y) > 0.72);
      const movingDebris = [...bodies.values()].some(body => body.plugin.birdGame.kind !== 'bird' && !body.isStatic && Math.hypot(body.velocity.x, body.velocity.y) > 2.1);
      inactivity = movingBird || movingDebris ? 0 : inactivity + stepMs;
      if (shotElapsed < 7800 && (shotElapsed < 1100 || inactivity < 540)) return;
      if (primaryData?.type === 'black' && !abilityUsed && bodies.has(primary.id)) {
        bomb();
        processBlasts();
        if (!remainingTargets) return;
      }
      for (const body of [...bodies.values()]) if (body.plugin.birdGame.kind === 'bird') removeBody(body);
      primary = null;
      if (!ammoCount()) finish(false);
      else {
        status = 'ready';
        abilityUsed = false;
        changed = true;
      }
    }

    function step(deltaMs) {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0 || !engine) return;
      accumulator += Math.min(deltaMs, 75);
      while (accumulator >= stepMs) {
        accumulator -= stepMs;
        motion.clear();
        if (status === 'flying') {
          for (const body of bodies.values()) motion.set(body.id, Body.getVelocity(body));
        }
        Engine.update(engine, stepMs);
        if (status === 'flying') {
          processImpacts();
          processBlasts();
          advanceShot();
        } else {
          impacts.length = 0;
        }
      }
      if (changed) publish();
    }

    function loadLevel(levelIndex) {
      const nextLevel = levelAt(levelIndex);
      if (!nextLevel) return false;
      if (engine) {
        Events.off(engine);
        Composite.clear(engine.world, false, true);
        Engine.clear(engine);
      }
      index = levelIndex;
      currentLevel = nextLevel;
      engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 7, constraintIterations: 3 });
      engine.gravity.y = gravity;
      engine.gravity.scale = 0.001;
      bodies = new Map();
      motion = new Map();
      impacts = [];
      blasts = [];
      nextEntityId = 1;
      queue = [...currentLevel.ammo];
      reserveAmmo = modifiers.extraAmmo;
      reserveIndex = 0;
      status = 'ready';
      aimPoint = null;
      preview = [];
      primary = null;
      birdType = null;
      abilityUsed = false;
      score = 0;
      remainingTargets = currentLevel.targets;
      shots = 0;
      stars = 0;
      combo = 0;
      shotElapsed = 0;
      inactivity = 0;
      winElapsed = 0;
      accumulator = 0;
      const ground = Bodies.rectangle(world.width / 2, G + 75, world.width + 130, 150, {
        isStatic: true, friction: 0.86, frictionStatic: 1, restitution: 0.02,
      });
      Composite.add(engine.world, ground);
      for (const item of currentLevel.layout) createBody(item);
      for (let i = 0; i < 70; i++) Engine.update(engine, stepMs);
      Events.on(engine, 'collisionStart', ({ pairs }) => { if (status === 'flying') impacts.push(...pairs); });
      publish();
      return true;
    }

    function setUnlimited(enabled) {
      const next = Boolean(enabled);
      if (unlimited === next) return;
      unlimited = next;
      if (unlimited && !ammoCount() && status === 'flying') queue.push(...currentLevel.ammo);
      if (unlimited && status === 'lost') {
        queue.push(...currentLevel.ammo);
        status = 'ready';
        abilityUsed = false;
      }
      publish();
    }

    function setModifiers(values = {}) {
      modifiers = {
        power: modifier(values.power, 1, 0.5),
        blast: modifier(values.blast, 1, 0.5),
        impact: modifier(values.impact, 1, 0.5),
        split: Math.floor(modifier(values.split, 0, 0)),
        extraAmmo: Math.min(Number.MAX_SAFE_INTEGER - 8, Math.floor(modifier(values.extraAmmo, 0, 0))),
        score: modifier(values.score, 1, 0.5),
        shock: modifier(values.shock, 0, 0),
      };
      if (aimPoint) preview = trajectoryFor(aimPoint);
      publish();
    }

    loadLevel(0);
    return {
      getState, step, aim, cancelAim, launch, useAbility, loadLevel, setUnlimited, setModifiers,
      reset: () => loadLevel(index),
      nextLevel: () => loadLevel(index + 1),
    };
  }

  window.BirdGame = Object.freeze({ create, levels, levelAt, birds, pigTypes, world });
})();
