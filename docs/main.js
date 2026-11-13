(() => {
  'use strict';

  const { create, birds, world, formatCount = String } = window.BirdGame;
  const audio = window.BirdAudio;
  const $ = id => document.getElementById(id);
  const arena = $('arena');
  const cabinet = arena.closest('.cabinet');
  const arenaHud = arena.querySelector('.arena-hud');
  const canvas = $('game');
  const targetCard = $('target-card') || arenaHud.querySelector('.target-card');
  const targetReadout = $('targets');
  const targetFormations = $('target-formations');
  const targetSummary = $('target-summary');
  const result = $('result');
  const help = $('instructions');
  const confirm = $('confirm');
  const confirmClear = $('confirm-clear');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowPortrait = matchMedia('(max-width: 580px) and (orientation: portrait)');
  const renderer = window.BirdRenderer.create(canvas);
  const cap = 5;
  const cardDeck = [
    { id: 'blast', name: '超载火药', icon: '💣', tier: '稀有', edge: '#ffae63', top: '#674341', desc: 'TNT 和黑鸟的爆炸范围增加 25%。' },
    { id: 'impact', name: '铁头弹', icon: '🧱', tier: '强化', edge: '#f8cb81', top: '#5f4445', desc: '小鸟的撞击伤害增加 30%。' },
    { id: 'split', name: '蜂群协议', icon: '🪽', tier: '稀有', edge: '#9ae7ff', top: '#34526b', desc: '蓝鸟的分裂威力增加 2 只小鸟的份量。' },
    { id: 'extraAmmo', name: '后备空投', icon: '📦', tier: '强化', edge: '#b9ee8d', top: '#3e5650', desc: '之后每关的出战队列增加 1 只小鸟。' },
    { id: 'shock', name: '撞击核芯', icon: '☄️', tier: '传奇', edge: '#fcb1e7', top: '#743f74', desc: '每只主鸟首次撞击引发爆炸，叠卡扩大范围。' },
    { id: 'score', name: '赏金合约', icon: '💰', tier: '强化', edge: '#ffe78a', top: '#645241', desc: '摧毁目标和建筑的得分增加 40%。' },
    { id: 'power', name: '弹弓涡轮', icon: '⚡', tier: '稀有', edge: '#cdb6ff', top: '#524678', desc: '初速增加 12%，轻拉也能打得更远。' },
  ];
  const tiers = { '强化': 0, '稀有': 1, '传奇': 2 };
  const initialAim = { x: 141, y: 400 };
  const saveKey = 'slingshot-chaos.run.v1';
  const campaignLength = 30;
  const chapters = ['峡谷前线', '余烬矿区', '高空运输线', '铁炉工区', '猪王禁区'];
  const arenaThemes = { quarry: 'dusk', sky: 'day', industrial: 'dusk', fortress: 'night' };

  let stageTotal = 0;
  let historyStars = 0;
  let upgrades = new Map();
  let oldState;
  let pendingResult = 0;
  let gesture;
  let keyboardAim = { ...initialAim };
  let best = 0;
  let ammoKey = '';
  let targetKey = '';
  let floatTimer;
  let comboTimer;
  let lastGroupFeedback = -Infinity;

  function savedRun() {
    try {
      const data = JSON.parse(localStorage.getItem(saveKey));
      if (!data || !Number.isSafeInteger(data.levelIndex) || data.levelIndex < 0) return null;
      const checkedUpgrades = new Map();
      for (const card of cardDeck) {
        const value = data.upgrades?.[card.id];
        if (Number.isSafeInteger(value) && value > 0) checkedUpgrades.set(card.id, value);
      }
      return {
        levelIndex: data.levelIndex,
        stageTotal: Number.isFinite(data.stageTotal) && data.stageTotal >= 0 ? data.stageTotal : 0,
        stars: Number.isSafeInteger(data.stars) && data.stars >= 0 ? data.stars : 0,
        upgrades: checkedUpgrades,
      };
    } catch {
      return null;
    }
  }

  function saveRun() {
    try {
      localStorage.setItem(saveKey, JSON.stringify({
        levelIndex: oldState.levelIndex, stageTotal, stars: historyStars, upgrades: Object.fromEntries(upgrades),
      }));
    } catch {}
  }

  try { best = Math.max(0, Number(localStorage.getItem('slingshot-chaos.best')) || 0); } catch {}
  const format = new Intl.NumberFormat('zh-CN');
  $('best-score').textContent = format.format(best);

  function exactPigCount(value) {
    return typeof value === 'string' ? value : format.format(value);
  }

  function positionTargetHud() {
    const aboveArena = targetFormations && !targetFormations.hidden && narrowPortrait.matches;
    if (aboveArena && arenaHud.parentElement !== cabinet) cabinet.prepend(arenaHud);
    if (!aboveArena && arenaHud.parentElement !== arena) canvas.after(arenaHud);
  }
  narrowPortrait.addEventListener('change', positionTargetHud);

  function updateTargets(state) {
    const { remainingTargets, totalTargets, remainingGroups, totalGroups, levelIndex } = state;
    const key = `${levelIndex}:${remainingTargets}:${totalTargets}:${remainingGroups}:${totalGroups}`;
    if (key === targetKey) return;
    targetKey = key;
    const grouped = levelIndex >= 4 && Number.isFinite(totalGroups);
    const compact = String(remainingTargets).length > 6 || String(totalTargets).length > 6;
    const visibleRemaining = formatCount(remainingTargets);
    const visibleTotal = formatCount(totalTargets);
    const exact = `剩余 ${exactPigCount(remainingTargets)} 只小猪，本关共 ${exactPigCount(totalTargets)} 只`;
    const groupCaption = grouped ? ` · ${remainingGroups}/${totalGroups} 队` : '';
    targetCard.dataset.remaining = String(remainingTargets);
    targetCard.dataset.total = String(totalTargets);
    targetCard.toggleAttribute('data-compact', compact);
    targetCard.title = exact + groupCaption;
    targetCard.setAttribute('aria-label', exact + groupCaption);
    targetReadout.textContent = compact ? visibleRemaining : `${visibleRemaining}/${visibleTotal}`;
    if (targetFormations) {
      targetFormations.hidden = !grouped;
      if (grouped) targetFormations.textContent = `编队 ${remainingGroups}/${totalGroups}`;
    }
    if (targetSummary) {
      targetSummary.hidden = !grouped;
      if (grouped) {
        const readableExact = typeof remainingTargets === 'string' || String(totalTargets).length <= 13;
        targetSummary.textContent = (readableExact ? exact : `剩余 ${visibleRemaining} 只小猪，本关共 ${visibleTotal} 只`) + groupCaption;
        targetSummary.title = exact + groupCaption;
      }
    }
    positionTargetHud();
  }

  function updateProgress(state) {
    const idx = state.levelIndex;
    const endless = idx >= campaignLength;
    $('stage-title').textContent = state.level.name;
    $('stage-number').textContent = endless ? '无尽 · 第 ' + format.format(idx + 1) + ' 关'
      : '第 ' + (idx + 1) + ' / ' + campaignLength + ' 关';
    const rating = state.level.rating ?? idx + 1;
    $('difficulty').textContent = (idx < 3 ? '热身' : '难度') + ' ' + format.format(rating);
    $('difficulty').classList.toggle('hard', idx >= 3);
    const chapter = state.level.region ?? Math.floor(idx / 6);
    arena.dataset.theme = arenaThemes[state.level.theme] || (idx < 3 ? 'day' : idx < 5 ? 'dusk' : 'night');
    $('boss-brief').hidden = idx < 3;
    $('enemy-brief').textContent = state.level.description;
    const progress = $('stage-nav');
    if (endless) {
      const mark = document.createElement('span');
      mark.className = 'stage-node current';
      mark.setAttribute('aria-current', 'step');
      mark.textContent = '∞';
      const text = document.createElement('span');
      text.className = 'endless-mark';
      text.textContent = '无尽挑战';
      progress.replaceChildren(mark, text);
      return;
    }
    progress.replaceChildren(...chapters.map((name, i) => {
      const span = document.createElement('span');
      const current = i === chapter;
      span.className = 'stage-node';
      span.classList.toggle('current', current);
      span.classList.toggle('done', i < chapter);
      span.classList.toggle('hazard', i > chapter);
      if (current) span.setAttribute('aria-current', 'step');
      span.title = name + ' · ' + (i * 6 + 1) + '–' + (i * 6 + 6) + ' 关';
      span.textContent = i < chapter ? '✓' : String(i + 1).padStart(2, '0');
      return span;
    }));
  }

  function icon(target, type) {
    const ctx = target.getContext('2d');
    const mid = target.width / 2;
    if (type === 'pig') window.BirdRenderer.drawPig(ctx, mid, mid + 3, mid * .66);
    else window.BirdRenderer.drawBird(ctx, type, mid, mid + 3, mid * .67);
  }
  icon($('brand-bird'), 'red');
  icon($('pig-icon'), 'pig');

  function announce(message) {
    $('announcer').textContent = message;
  }

  function transient(id, message) {
    const target = $(id);
    target.classList.remove('on');
    target.textContent = message;
    void target.offsetWidth;
    target.classList.add('on');
    if (id === 'combo') {
      clearTimeout(comboTimer);
      comboTimer = setTimeout(() => target.classList.remove('on'), 950);
    } else {
      clearTimeout(floatTimer);
      floatTimer = setTimeout(() => target.classList.remove('on'), 1900);
    }
  }

  function updateAmmo(state) {
    const count = state.ammoCount ?? state.ammo.length;
    const visible = state.ammo.slice(0, cap);
    const nextKey = count + ':' + visible.join(',');
    if (ammoKey === nextKey) return;
    ammoKey = nextKey;
    const queue = $('ammo');
    queue.replaceChildren();
    queue.setAttribute('aria-label', count ? count + ' 只待发射。' + visible.map(type => birds[type].name).join('、') : '弹药已用完');
    visible.forEach(type => {
      const token = document.createElement('span');
      token.className = 'ammo-token';
      token.title = birds[type].name + ' · ' + birds[type].ability;
      const image = document.createElement('canvas');
      image.width = image.height = 88;
      image.setAttribute('aria-hidden', 'true');
      token.append(image);
      icon(image, type);
      queue.append(token);
    });
    if (count > cap) {
      const more = document.createElement('span');
      more.className = 'ammo-more';
      more.textContent = '+' + format.format(count - cap);
      queue.append(more);
    }
    if (!count) {
      const empty = document.createElement('span');
      empty.className = 'ammo-empty';
      empty.textContent = '弹药已用完';
      queue.append(empty);
    }
  }

  function renderUpgrades() {
    const list = $('upgrades');
    $('clear-cards').disabled = !upgrades.size;
    if (!upgrades.size) {
      const empty = document.createElement('span');
      empty.className = 'empty-run';
      empty.textContent = '通关后抽取强化卡，效果会持续叠加。';
      list.replaceChildren(empty);
      return;
    }
    list.replaceChildren(...Array.from(upgrades, ([id, count]) => {
      const card = cardDeck.find(entry => entry.id === id);
      const chip = document.createElement('span');
      chip.className = 'upgrade-chip';
      chip.title = card.desc;
      chip.textContent = card.icon + ' ' + card.name;
      if (count > 1) {
        const qty = document.createElement('b');
        qty.textContent = ' ×' + format.format(count);
        chip.append(qty);
      }
      return chip;
    }));
  }

  function modifiers() {
    const get = id => upgrades.get(id) ?? 0;
    return {
      power: 1 + get('power') * .12,
      impact: 1 + get('impact') * .30,
      blast: 1 + get('blast') * .25,
      score: 1 + get('score') * .40,
      split: get('split') * 2,
      extraAmmo: get('extraAmmo'),
      shock: get('shock') ? 106 + (get('shock') - 1) * 28 : 0,
    };
  }

  function drawCards() {
    const pool = [...cardDeck];
    const picked = [];
    while (picked.length < 3) {
      const weights = pool.map(card => [5, 4, 2][tiers[card.tier]]);
      let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
      const index = weights.findIndex(weight => (roll -= weight) < 0);
      picked.push(...pool.splice(index < 0 ? pool.length - 1 : index, 1));
    }
    return picked;
  }

  function onChange(state) {
    const previous = oldState;
    oldState = state;
    const freshLevel = !previous || previous.levelIndex !== state.levelIndex;
    if (freshLevel) updateProgress(state);
    canvas.dataset.mode = state.status;
    $('sling-hint').hidden = state.levelIndex !== 0 || state.shots > 0 || state.status !== 'ready';
    $('score').textContent = String(stageTotal + state.score).padStart(6, '0');
    updateTargets(state);
    updateAmmo(state);
    const skill = state.activeBirdType && birds[state.activeBirdType];
    const available = state.status === 'flying' && !state.abilityUsed && Boolean(skill);
    $('ability').disabled = !available;
    $('ability-label').textContent = state.abilityUsed && state.status === 'flying' ? '技能已使用'
      : skill ? skill.name + skill.ability : '飞行技能';
    if (skill) $('ability').title = skill.description;
    if (state.status === 'ready') $('control-hint').textContent = state.shots === 0 && state.levelIndex < 3
      ? state.level.description : '拖动小鸟瞄准，松手发射。';
    if (state.status === 'aiming') $('control-hint').textContent = '沿着预览弹道瞄准，松手发射。';
    if (state.status === 'flying') $('control-hint').textContent = available
      ? '点击战场、按空格或点技能按钮。' : '等待飞行和连锁碰撞结束。';
    if ((state.status === 'won' || state.status === 'lost') && state.status !== previous?.status) {
      rememberBest(stageTotal + state.score);
      pendingResult = window.setTimeout(() => showResult(state), reduced.matches ? 100 : 560);
    }
  }

  function rememberBest(score) {
    if (score <= best) return;
    best = score;
    $('best-score').textContent = format.format(best);
    try { localStorage.setItem('slingshot-chaos.best', String(best)); } catch {}
  }

  function onEffect(event) {
    renderer.effect(event);
    const cue = { guard: 'hit', armorBreak: 'break', shieldBreak: 'break', rage: 'blast', kingRage: 'blast', pigHit: 'hit' }[event.type];
    audio.play(cue || event.type);
    if (event.type === 'blast' && event.material === 'tnt') transient('combo', '轰！');
    if (event.type === 'armorBreak' || event.type === 'shieldBreak') transient('combo', '破防！');
    if (event.type === 'rage' || event.type === 'kingRage') transient('combo', '猪王暴怒！');
    if ((event.type === 'pigHit' || event.type === 'pig') && event.grouped && event.casualties) {
      const now = performance.now();
      const combo = $('combo');
      if (now - lastGroupFeedback >= 340 && !(combo.classList.contains('on') && combo.textContent === '猪王暴怒！')) {
        lastGroupFeedback = now;
        transient('combo', '击倒 ' + formatCount(event.casualties) + ' 只！');
      }
    } else if (event.type === 'pig' && event.combo > 1) transient('combo', event.combo + ' 连锁击倒！');
  }

  const game = create({ onChange, onEffect });
  const saved = savedRun();
  if (saved) {
    stageTotal = saved.stageTotal;
    historyStars = saved.stars;
    upgrades = saved.upgrades;
    game.setModifiers(modifiers());
    game.loadLevel(saved.levelIndex);
  }
  renderUpgrades();

  function resetVisuals() {
    clearTimeout(pendingResult);
    clearTimeout(floatTimer);
    clearTimeout(comboTimer);
    $('notice').classList.remove('on');
    $('combo').classList.remove('on');
    lastGroupFeedback = -Infinity;
    cancelGesture();
    keyboardAim = { ...initialAim };
    renderer.reset();
    if (result.open) result.close();
  }

  function restartLevel() {
    resetVisuals();
    game.reset();
    canvas.focus({ preventScroll: true });
    announce('已重玩' + oldState.level.name);
  }

  function startRun() {
    resetVisuals();
    stageTotal = 0;
    historyStars = 0;
    upgrades = new Map();
    renderUpgrades();
    game.setModifiers(modifiers());
    game.loadLevel(0);
    saveRun();
    canvas.focus({ preventScroll: true });
    announce('已开始新一轮');
  }

  function actionButton(label, action, primary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = primary ? 'primary-btn' : 'soft-btn';
    button.textContent = label;
    button.addEventListener('click', () => {
      audio.unlock();
      audio.play('click');
      action();
    });
    return button;
  }

  function nextWith(card, state) {
    if (!result.open || oldState.status !== 'won' || oldState.levelIndex !== state.levelIndex) return;
    upgrades.set(card.id, (upgrades.get(card.id) || 0) + 1);
    stageTotal += state.score;
    historyStars += state.stars;
    renderUpgrades();
    resetVisuals();
    game.setModifiers(modifiers());
    game.nextLevel();
    saveRun();
    transient('notice', '已获得「' + card.name + '」');
    announce('获得' + card.name + '，进入' + oldState.level.name);
    canvas.focus({ preventScroll: true });
  }

  function makeCard(card, state) {
    const button = document.createElement('button');
    button.className = 'card';
    button.type = 'button';
    button.style.setProperty('--card-edge', card.edge);
    button.style.setProperty('--card-top', card.top);
    for (const [name, value] of [['emoji', card.icon], ['tier', card.tier], ['name', card.name], ['desc', card.desc]]) {
      const span = document.createElement('span');
      span.className = 'card-' + name;
      span.textContent = value;
      if (name === 'emoji') span.setAttribute('aria-hidden', 'true');
      button.append(span);
    }
    button.addEventListener('click', () => {
      audio.unlock();
      audio.play('click');
      nextWith(card, state);
    });
    return button;
  }

  function showResult(state) {
    if (oldState.levelIndex !== state.levelIndex || oldState.status !== state.status || result.open) return;
    if (help.open) help.close();
    if (confirm.open) confirm.close();
    const won = state.status === 'won';
    const mainCleared = won && state.levelIndex === campaignLength - 1;
    const stars = $('result-stars');
    stars.replaceChildren();
    stars.hidden = !won;
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.textContent = '★';
      star.classList.toggle('dim', i >= state.stars);
      stars.append(star);
    }
    const title = mainCleared ? '主线通关，无尽开启！' : won ? '猪堡被炸翻了！' : '弹药用完了';
    $('result-title').textContent = title;
    $('result-copy').textContent = mainCleared
      ? '30 关全通 · ' + (historyStars + state.stars) + '/90 星 · 选卡后继续挑战第 31 关。'
      : won ? '本关 ' + state.stars + '/3 星 · +' + format.format(state.score) + ' 分'
        : '还有 ' + formatCount(state.remainingTargets) + ' 只小猪。' + (upgrades.size ? '重玩本关时，你的强化卡仍然有效。' : '试试换一个角度或调整出手顺序。');
    $('draw').hidden = !won;
    $('cards').replaceChildren();
    $('result-actions').replaceChildren();
    if (won) {
      $('cards').append(...drawCards().map(card => makeCard(card, state)));
      $('result-actions').append(actionButton('重玩本关', restartLevel));
    } else {
      $('result-actions').append(actionButton('重玩本关', restartLevel, true));
      if (upgrades.size) $('result-actions').append(actionButton('清空卡片', () => openModal(confirmClear)));
      if (state.levelIndex) $('result-actions').append(actionButton('新开一轮', () => openModal(confirm)));
    }
    openModal(result);
    announce(title);
  }

  function openModal(dialog) {
    cancelGesture();
    dialog.showModal();
  }

  function playClick(handler) {
    return () => {
      audio.unlock();
      audio.play('click');
      handler();
    };
  }
  function showMuted() {
    const muted = audio.isMuted();
    $('sound').setAttribute('aria-pressed', String(muted));
    const label = muted ? '开启音效' : '关闭音效';
    $('sound').title = label;
    $('sound').setAttribute('aria-label', label);
  }
  $('sound').addEventListener('click', () => {
    audio.unlock();
    audio.setMuted(!audio.isMuted());
    showMuted();
    audio.play('click');
  });
  showMuted();
  $('help').addEventListener('click', playClick(() => openModal(help)));
  $('close-help').addEventListener('click', playClick(() => help.close()));
  $('retry').addEventListener('click', playClick(restartLevel));
  $('restart-run').addEventListener('click', playClick(() => {
    if (!oldState.levelIndex && !upgrades.size && !oldState.shots) startRun();
    else openModal(confirm);
  }));
  $('cancel-new').addEventListener('click', playClick(() => confirm.close()));
  $('confirm-new').addEventListener('click', playClick(() => {
    confirm.close();
    startRun();
  }));
  $('clear-cards').addEventListener('click', playClick(() => openModal(confirmClear)));
  $('cancel-clear').addEventListener('click', playClick(() => confirmClear.close()));
  $('accept-clear').addEventListener('click', playClick(() => {
    confirmClear.close();
    upgrades.clear();
    renderUpgrades();
    resetVisuals();
    game.setModifiers(modifiers());
    game.reset();
    saveRun();
    canvas.focus({ preventScroll: true });
    transient('notice', '卡片已清空');
    announce('卡片已清空，已重开当前关');
  }));
  $('ability').addEventListener('click', () => {
    audio.unlock();
    game.useAbility();
  });
  result.addEventListener('cancel', event => event.preventDefault());

  const tapSlop = 12;

  function beginGesture(event, details) {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, ...details };
  }

  function endGesture() {
    const active = gesture;
    gesture = undefined;
    if (active && canvas.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
    return active;
  }

  function cancelGesture() {
    if (endGesture()?.kind === 'aim') game.cancelAim();
  }

  function updateDrag(event) {
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.kind === 'skill') {
      if (Math.hypot(dx, dy) > tapSlop) gesture.moved = true;
      return;
    }
    game.aim(gesture.anchor.x + dx * gesture.scaleX, gesture.anchor.y + dy * gesture.scaleY);
  }
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    audio.unlock();
    const state = oldState;
    if (state.status === 'flying') {
      if (state.abilityUsed) return;
      if (event.pointerType === 'mouse') game.useAbility();
      else beginGesture(event, { kind: 'skill', shot: state.shots });
      return;
    }
    if (state.status !== 'ready' && state.status !== 'aiming') return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scaleX = world.width / rect.width;
    const scaleY = world.height / rect.height;
    const anchor = game.getState().aim || world.sling;
    const dx = (event.clientX - rect.left) * scaleX - anchor.x;
    const dy = (event.clientY - rect.top) * scaleY - anchor.y;
    const range = event.pointerType === 'mouse' ? 55 : Math.max(83, 30 * scaleX);
    if (Math.hypot(dx, dy) > range) return;
    beginGesture(event, { kind: 'aim', anchor, scaleX, scaleY });
    canvas.focus({ preventScroll: true });
    game.aim(anchor.x, anchor.y);
    audio.play('pull');
  });
  canvas.addEventListener('pointermove', event => {
    if (gesture?.id === event.pointerId) updateDrag(event);
  });
  canvas.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    updateDrag(event);
    const active = endGesture();
    if (active.kind === 'aim') game.launch();
    else if (!active.moved && active.shot === oldState.shots) game.useAbility();
  });
  function cancelDrag(event) {
    if (gesture?.id === event.pointerId) cancelGesture();
  }
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', cancelDrag);
  window.addEventListener('blur', cancelGesture);
  window.addEventListener('resize', cancelGesture);

  canvas.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || gesture) return;
    const { status } = oldState;
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrows.includes(event.key) && (status === 'ready' || status === 'aiming')) {
      event.preventDefault();
      audio.unlock();
      if (event.key === 'ArrowUp') keyboardAim.y += 6;
      if (event.key === 'ArrowDown') keyboardAim.y -= 6;
      if (event.key === 'ArrowLeft') keyboardAim.x -= 6;
      if (event.key === 'ArrowRight') keyboardAim.x += 6;
      keyboardAim.x = Math.max(87, Math.min(189, keyboardAim.x));
      keyboardAim.y = Math.max(268, Math.min(508, keyboardAim.y));
      game.aim(keyboardAim.x, keyboardAim.y);
    }
    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      audio.unlock();
      if (status === 'flying') game.useAbility();
      else if (status === 'aiming' || status === 'ready') {
        if (status === 'ready') game.aim(keyboardAim.x, keyboardAim.y);
        game.launch();
      }
    }
    if (event.key === 'Escape' && status === 'aiming') game.cancelAim();
  });

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey
      || result.open || help.open || confirm.open || confirmClear.open) return;
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      playClick(restartLevel)();
    }
    if (event.code === 'Space' && oldState.status === 'flying' && !event.target.closest('button, a, input')) {
      event.preventDefault();
      audio.unlock();
      game.useAbility();
    }
  });

  let lastTime = performance.now();
  function frame(now) {
    const delta = Math.max(0, Math.min(40, now - lastTime));
    lastTime = now;
    if (!help.open && !confirm.open && !confirmClear.open && !result.open) game.step(delta);
    renderer.draw(game.getState(), delta);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
