/* =========================================================
   games.js – мини игри (#games)
   Всяка игра е обект с: key, name, mount(stage, api), unmount(), onKey(e)
   api.setScore(n)  – показва текущите точки
   api.finish(n)    – записва резултата и обновява класацията
   api.message(txt) – текст под игралното поле
   api.popScore(n)  – летящо „+n“ над точките
   ========================================================= */

/* Цветовете на игрите идват от темата на сайта */
function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Плъзгане с пръст: извиква cb('up'|'down'|'left'|'right') */
function onSwipe(el, cb) {
  let sx = 0, sy = 0;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
}

const KEY_DIRS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

/* Бутони със стрелки за телефон */
function dpadHtml() {
  const arrow = rot => `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${rot}deg)"><path d="M12 5l7 8H5z"/></svg>`;
  return `<div class="dpad">
    <button type="button" data-dir="up" aria-label="Нагоре">${arrow(0)}</button>
    <button type="button" data-dir="left" aria-label="Наляво">${arrow(-90)}</button>
    <button type="button" data-dir="down" aria-label="Надолу">${arrow(180)}</button>
    <button type="button" data-dir="right" aria-label="Надясно">${arrow(90)}</button>
  </div>`;
}

/* Конфети при нов рекорд */
function celebrate(container) {
  if (reduceMotion()) return;
  const colors = ['#f0a03a', '#4cc47a', '#2f7fd1', '#d6457f', '#7a55d6', '#f2d24b'];
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('i');
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = Math.random() * 0.3 + 's';
    piece.style.animationDuration = 1 + Math.random() * 0.9 + 's';
    piece.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
    piece.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
    box.appendChild(piece);
  }
  container.appendChild(box);
  setTimeout(() => box.remove(), 2400);
}

/* =========================================================
   ЗМИЯ
   Логиката се движи на „стъпки“ (клетка по клетка), но рисуването
   е 60 пъти в секунда и плавно преминава между двете позиции.
   ========================================================= */
const SnakeGame = {
  key: 'snake',
  name: 'Змия',
  unit: 'точки',
  desc: 'Яж ябълки и расти, без да се удряш в стената или в себе си.',
  help: ['Стрелки или W A S D – посока', 'На телефон – плъзни с пръст или ползвай бутоните', 'Всяка ябълка е 1 точка, а змията се ускорява', 'Интервал – пауза'],
  size: 18,          // клетки на ред
  W: 540,            // логическа ширина на полето (в пиксели при мащаб 1)

  mount(stage, api) {
    this.api = api;
    stage.innerHTML = `
      <div class="snake-wrap">
        <canvas class="snake-canvas" aria-label="Игрално поле за Змия"></canvas>
        <div class="game-overlay" id="snakeOverlay">
          <b>Змия</b><span>Натисни стрелка или „Старт“</span>
          <button type="button" class="btn btn--primary" data-snake="start">Старт</button>
        </div>
      </div>
      ${dpadHtml()}`;
    this.wrap = stage.querySelector('.snake-wrap');
    this.canvas = stage.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.overlay = stage.querySelector('#snakeOverlay');

    stage.addEventListener('click', e => {
      if (e.target.closest('[data-snake="start"]')) this.start();
      const d = e.target.closest('[data-dir]');
      if (d) this.turn(d.dataset.dir);
    });
    onSwipe(this.canvas, dir => this.turn(dir));

    // Острота на екрани с висока резолюция
    this.resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const css = this.canvas.clientWidth || 440;
      this.canvas.width = Math.round(css * dpr);
      this.canvas.height = Math.round(css * dpr);
      this.scale = this.canvas.width / this.W;
    };
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvas);
    this.resize();

    this.running = false;
    this.over = false;
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
    this.reset();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  },

  unmount() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
  },

  reset() {
    const mid = Math.floor(this.size / 2);
    this.snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }, { x: mid - 3, y: mid }];
    this.prev = this.snake.map(p => ({ ...p }));
    this.dir = 'right';
    this.queue = [];
    this.score = 0;
    this.speed = 150;          // милисекунди за една стъпка
    this.lastStep = performance.now();
    this.placeFood();
    this.api.setScore(0);
  },

  start() {
    if (this.running) return;
    if (this.over) { this.over = false; this.reset(); }
    this.running = true;
    this.paused = false;
    this.overlay.hidden = true;
    this.overlay.classList.remove('is-shown');
    this.api.message('');
    this.lastStep = performance.now();
    Sound.play('start');
  },

  placeFood() {
    do {
      this.food = { x: Math.floor(Math.random() * this.size), y: Math.floor(Math.random() * this.size) };
    } while (this.snake.some(p => p.x === this.food.x && p.y === this.food.y));
    this.foodBorn = performance.now();
  },

  // Завоите се трупат в опашка, за да не се изгубят бързи натискания
  turn(dir) {
    if (this.over) { this.start(); }
    if (!this.running) {
      // Преди старта може да тръгнеш във всяка посока – змията се обръща
      if (dir === OPPOSITE[this.dir]) {
        this.snake.reverse();
        this.prev = this.snake.map(p => ({ ...p }));
        this.dir = dir;
      } else if (dir !== this.dir) {
        this.queue = [dir];
      }
      this.start();
      return;
    }
    const last = this.queue[this.queue.length - 1] || this.dir;
    if (dir !== last && dir !== OPPOSITE[last] && this.queue.length < 3) this.queue.push(dir);
  },

  step() {
    if (this.queue.length) this.dir = this.queue.shift();
    const head = { ...this.snake[0] };
    head.x += this.dir === 'right' ? 1 : this.dir === 'left' ? -1 : 0;
    head.y += this.dir === 'down' ? 1 : this.dir === 'up' ? -1 : 0;

    const eats = head.x === this.food.x && head.y === this.food.y;
    // Опашката се мести, освен ако змията не яде – тогава и тя е препятствие
    const body = eats ? this.snake : this.snake.slice(0, -1);
    const hitWall = head.x < 0 || head.y < 0 || head.x >= this.size || head.y >= this.size;
    const hitSelf = body.some(p => p.x === head.x && p.y === head.y);
    if (hitWall || hitSelf) return this.gameOver();

    this.prev = this.snake.map(p => ({ ...p }));
    this.snake.unshift(head);
    if (eats) {
      this.score++;
      this.api.setScore(this.score);
      this.api.popScore(1);
      this.speed = Math.max(70, this.speed - 3);
      this.burst(this.food.x, this.food.y);
      Sound.play('eat');
      this.placeFood();
      this.prev.push({ ...this.prev[this.prev.length - 1] });   // новото парче расте от опашката
    } else {
      this.snake.pop();
    }
  },

  burst(cx, cy) {
    const c = this.W / this.size;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3;
      this.particles.push({ x: (cx + 0.5) * c, y: (cy + 0.5) * c, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 });
    }
    this.floaters.push({ x: (cx + 0.5) * c, y: (cy + 0.2) * c, life: 1 });
  },

  gameOver() {
    this.running = false;
    this.over = true;
    this.shake = 1;
    Sound.play('gameover');
    const res = this.api.finish(this.score);
    setTimeout(() => {
      if (!this.over) return;
      this.overlay.innerHTML = `
        <b>${res.isRecord && this.score > 0 ? 'Нов рекорд!' : 'Край на играта'}</b>
        <span>${this.score} ${this.score === 1 ? 'точка' : 'точки'} · рекорд ${res.best ?? 0}</span>
        <button type="button" class="btn btn--primary" data-snake="start">Играй пак</button>`;
      this.overlay.hidden = false;
      requestAnimationFrame(() => this.overlay.classList.add('is-shown'));
    }, 550);
  },

  loop(now) {
    if (this.running && !this.paused) {
      while (now - this.lastStep >= this.speed && this.running) {
        this.lastStep += this.speed;
        this.step();
      }
    }
    const t = this.running && !this.paused ? Math.min(1, (now - this.lastStep) / this.speed) : 1;
    this.draw(t, now);
    this.raf = requestAnimationFrame(this.loop);
  },

  /* ---------- Рисуване ---------- */
  draw(t, now) {
    const { ctx, size } = this;
    const c = this.W / size;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    // разтърсване при удар
    if (this.shake > 0) {
      const s = this.shake * 7;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      this.shake = Math.max(0, this.shake - 0.05);
    }

    // поле: шахматна трева
    const light = themeColor('--surface-2'), line = themeColor('--line');
    ctx.fillStyle = light;
    ctx.fillRect(-10, -10, this.W + 20, this.W + 20);
    ctx.fillStyle = line;
    ctx.globalAlpha = 0.45;
    for (let y = 0; y < size; y++) for (let x = (y % 2); x < size; x += 2) ctx.fillRect(x * c, y * c, c, c);
    ctx.globalAlpha = 1;

    this.drawFood(c, now);
    this.drawSnake(c, t, now);
    this.drawEffects(c);
  },

  drawFood(c, now) {
    const { ctx, food } = this;
    const age = Math.min(1, (now - this.foodBorn) / 250);          // появява се с „изскачане“
    const pulse = 1 + Math.sin(now / 220) * 0.06;
    const r = c * 0.36 * pulse * (age < 1 ? 0.4 + age * 0.6 : 1);
    const x = (food.x + 0.5) * c, y = (food.y + 0.55) * c;

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 0.8, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ff8a73'); g.addColorStop(1, '#d4321f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // дръжка и листо
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = c * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x + r * 0.1, y - r * 1.25); ctx.stroke();
    ctx.fillStyle = '#3cb35a';
    ctx.beginPath(); ctx.ellipse(x + r * 0.42, y - r * 1.1, r * 0.38, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
    // отблясък
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.18, r * 0.11, -0.6, 0, Math.PI * 2); ctx.fill();
  },

  // Плавна позиция на всяко парче между предишната и сегашната стъпка
  points(c, t) {
    return this.snake.map((p, i) => {
      const q = this.prev[i] || this.prev[this.prev.length - 1];
      return { x: (q.x + (p.x - q.x) * t + 0.5) * c, y: (q.y + (p.y - q.y) * t + 0.5) * c };
    });
  },

  drawSnake(c, t, now) {
    const { ctx } = this;
    const pts = this.points(c, t);
    const n = pts.length;
    const dead = this.over;
    const dark = dead ? '#7d8a83' : '#17693a';
    const main = dead ? '#a3b0a8' : '#2fa15a';
    const belly = dead ? '#c7d0cb' : '#7fd69a';
    const width = i => c * (0.78 - 0.34 * (i / Math.max(1, n - 1)));   // изтънява към опашката

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // сянка, контур, основен цвят, светла ивица – от опашката към главата
    const pass = (color, extra, offY = 0) => {
      ctx.strokeStyle = color;
      for (let i = n - 1; i > 0; i--) {
        ctx.lineWidth = width(i) + extra;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y + offY);
        ctx.lineTo(pts[i - 1].x, pts[i - 1].y + offY);
        ctx.stroke();
      }
    };
    pass('rgba(0,0,0,0.12)', 0, c * 0.12);
    pass(dark, c * 0.08);
    pass(main, 0);
    ctx.globalAlpha = 0.55;
    pass(belly, -c * 0.46);
    ctx.globalAlpha = 1;

    // люспи – ромбчета по гърба
    ctx.fillStyle = dark;
    ctx.globalAlpha = 0.35;
    for (let i = 1; i < n; i += 1) {
      const a = pts[i], b = pts[i - 1];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const s = width(i) * 0.16;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(ang + Math.PI / 4);
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    this.drawHead(pts[0], pts[1] || pts[0], c, now, main, dark);
  },

  drawHead(h, neck, c, now, main, dark) {
    const { ctx } = this;
    let ang = Math.atan2(h.y - neck.y, h.x - neck.x);
    if (h.x === neck.x && h.y === neck.y) ang = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 }[this.dir];
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(ang);

    // език – трепва на всеки ~1.4 секунди
    const flick = (now % 1400) < 220 && !this.over;
    if (flick) {
      ctx.strokeStyle = '#e0364f'; ctx.lineWidth = c * 0.06; ctx.lineCap = 'round';
      const L = c * 0.55;
      ctx.beginPath();
      ctx.moveTo(c * 0.3, 0); ctx.lineTo(L, 0);
      ctx.lineTo(L + c * 0.12, -c * 0.08); ctx.moveTo(L, 0); ctx.lineTo(L + c * 0.12, c * 0.08);
      ctx.stroke();
    }

    // глава – леко издължена
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(c * 0.06, 0, c * 0.5, c * 0.44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.ellipse(c * 0.06, 0, c * 0.45, c * 0.39, 0, 0, Math.PI * 2); ctx.fill();

    // очи – при удар стават „X“
    for (const side of [-1, 1]) {
      const ex = c * 0.16, ey = side * c * 0.2;
      if (this.over) {
        ctx.strokeStyle = '#1b2a22'; ctx.lineWidth = c * 0.06;
        const s = c * 0.08;
        ctx.beginPath(); ctx.moveTo(ex - s, ey - s); ctx.lineTo(ex + s, ey + s); ctx.moveTo(ex + s, ey - s); ctx.lineTo(ex - s, ey + s); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, ey, c * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#14201a';
        ctx.beginPath(); ctx.arc(ex + c * 0.04, ey, c * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + c * 0.06, ey - c * 0.03, c * 0.025, 0, Math.PI * 2); ctx.fill();
      }
    }
    // ноздри
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(c * 0.42, -c * 0.07, c * 0.025, 0, Math.PI * 2); ctx.arc(c * 0.42, c * 0.07, c * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  drawEffects(c) {
    const { ctx } = this;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life -= 0.04;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.life > 0.5 ? '#ff8a73' : '#f0a03a';
      ctx.beginPath(); ctx.arc(p.x, p.y, c * 0.09 * p.life + 1, 0, Math.PI * 2); ctx.fill();
    }
    this.floaters = this.floaters.filter(f => f.life > 0);
    ctx.font = `800 ${c * 0.7}px 'Bricolage Grotesque', sans-serif`;
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      f.y -= 1.1; f.life -= 0.022;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = themeColor('--accent');
      ctx.fillText('+1', f.x, f.y);
    }
    ctx.globalAlpha = 1;
  },

  onKey(e) {
    if (e.key === ' ') {
      if (!this.running) { this.start(); return true; }
      this.paused = !this.paused;
      this.api.message(this.paused ? 'Пауза. Натисни интервал, за да продължиш.' : '');
      if (!this.paused) this.lastStep = performance.now();
      return true;
    }
    const dir = KEY_DIRS[e.key];
    if (dir) { this.turn(dir); return true; }
  }
};

/* =========================================================
   2048
   Всяка плочка е отделен елемент, който се плъзга с CSS transition.
   При сливане двете плочки отиват на едно място, после едната
   изчезва, а другата „изскача“ с новата стойност.
   ========================================================= */
const Game2048 = {
  key: '2048',
  name: '2048',
  unit: 'точки',
  desc: 'Събирай еднакви плочки, докато стигнеш до 2048.',
  help: ['Стрелки или W A S D – мести всички плочки', 'На телефон – плъзни с пръст по полето', 'Две еднакви плочки се сливат в една', 'Точките са сборът от слетите плочки'],
  ANIM: 110,

  mount(stage, api) {
    this.api = api;
    stage.innerHTML = `
      <div class="g2048" aria-label="Игрално поле за 2048">
        ${Array.from({ length: 16 }, () => '<div class="g2048-cell"></div>').join('')}
        <div class="g2048-tiles"></div>
        <div class="game-overlay g2048-over" hidden></div>
      </div>
      <div class="game-buttons">
        <button type="button" class="btn btn--ghost btn--sm" data-2048="new">Нова игра</button>
      </div>`;
    this.board = stage.querySelector('.g2048');
    this.layer = stage.querySelector('.g2048-tiles');
    this.overEl = stage.querySelector('.g2048-over');
    stage.addEventListener('click', e => {
      if (e.target.closest('[data-2048="new"]')) this.newGame(true);
    });
    onSwipe(this.board, dir => this.move(dir));
    this.newGame(false);
  },

  unmount() {
    clearTimeout(this.timer);
    // Резултат се записва само ако играта е истинска (поне 100 точки)
    if (this.score >= 100 && !this.over) this.api.finish(this.score);
    this.score = 0;
  },

  newGame(saveCurrent) {
    clearTimeout(this.timer);
    if (saveCurrent && this.score >= 100 && !this.over) this.api.finish(this.score);
    this.tiles = [];
    this.layer.innerHTML = '';
    this.score = 0;
    this.over = false;
    this.won = false;
    this.pending = null;
    this.overEl.hidden = true;
    this.overEl.classList.remove('is-shown');
    this.addTile();
    this.addTile();
    this.api.setScore(0);
    this.api.message('');
  },

  tileAt(x, y) { return this.tiles.find(t => t.x === x && t.y === y && !t.gone); },

  addTile() {
    const empty = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (!this.tileAt(x, y)) empty.push([x, y]);
    if (!empty.length) return;
    const [x, y] = empty[Math.floor(Math.random() * empty.length)];
    const tile = { id: generateId(), v: Math.random() < 0.9 ? 2 : 4, x, y };
    tile.el = document.createElement('div');
    tile.el.className = `tile tile--${tile.v} tile--new`;
    tile.el.textContent = tile.v;
    this.place(tile);
    this.layer.appendChild(tile.el);
    this.tiles.push(tile);
  },

  place(t) {
    t.el.style.setProperty('--x', t.x);
    t.el.style.setProperty('--y', t.y);
  },

  move(dir) {
    if (this.over) return;
    if (this.pending) this.finishMove();      // бърз следващ ход – довършваме предишния веднага

    const vec = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
    // Обхождаме от ръба, към който местим
    const xs = vec[0] === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const ys = vec[1] === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const merged = new Set();
    let moved = false, gained = 0;

    for (const y of ys) for (const x of xs) {
      const t = this.tileAt(x, y);
      if (!t) continue;
      let nx = x, ny = y;
      while (true) {
        const tx = nx + vec[0], ty = ny + vec[1];
        if (tx < 0 || ty < 0 || tx > 3 || ty > 3) break;
        const other = this.tileAt(tx, ty);
        if (!other) { nx = tx; ny = ty; continue; }
        if (other.v === t.v && !merged.has(other.id)) {
          // сливане: t отива върху other и изчезва
          t.x = tx; t.y = ty; t.gone = true; t.into = other;
          other.v *= 2;
          merged.add(other.id);
          gained += other.v;
          moved = true;
        }
        break;
      }
      if (!t.gone && (nx !== t.x || ny !== t.y)) { t.x = nx; t.y = ny; moved = true; }
      this.place(t);
    }
    if (!moved) return;

    Sound.play(gained ? 'merge' : 'slide', Math.max(...this.tiles.filter(t => merged.has(t.id)).map(t => t.v), 2));
    this.score += gained;
    this.api.setScore(this.score);
    if (gained) this.api.popScore(gained);
    this.pending = merged;
    this.timer = setTimeout(() => this.finishMove(), this.ANIM);
  },

  // След плъзгането: махаме слетите плочки, обновяваме стойностите, добавяме нова
  finishMove() {
    clearTimeout(this.timer);
    const merged = this.pending;
    this.pending = null;
    for (const t of this.tiles.filter(t => t.gone)) t.el.remove();
    this.tiles = this.tiles.filter(t => !t.gone);
    for (const t of this.tiles) {
      t.el.classList.remove('tile--new');
      if (merged.has(t.id)) {
        t.el.className = `tile tile--${Math.min(t.v, 4096)}`;
        t.el.textContent = t.v;
        void t.el.offsetWidth;            // рестартира анимацията
        t.el.classList.add('tile--merged');
      }
    }
    this.addTile();

    if (!this.won && this.tiles.some(t => t.v === 2048)) {
      this.won = true;
      Sound.play('win');
      this.api.message('Стигна 2048! Можеш да продължиш за още точки.');
    }
    if (!this.canMove()) {
      this.over = true;
      Sound.play('gameover');
      const res = this.api.finish(this.score);
      this.overEl.innerHTML = `
        <b>${res.isRecord ? 'Нов рекорд!' : 'Няма повече ходове'}</b>
        <span>${this.score} точки · рекорд ${res.best ?? 0}</span>
        <button type="button" class="btn btn--primary" data-2048="new">Нова игра</button>`;
      this.overEl.hidden = false;
      requestAnimationFrame(() => this.overEl.classList.add('is-shown'));
    }
  },

  canMove() {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const t = this.tileAt(x, y);
      if (!t) return true;
      const r = this.tileAt(x + 1, y), d = this.tileAt(x, y + 1);
      if ((r && r.v === t.v) || (d && d.v === t.v)) return true;
    }
    return false;
  },

  onKey(e) {
    const dir = KEY_DIRS[e.key];
    if (dir) { this.move(dir); return true; }
  }
};

/* =========================================================
   МОРСКИ ШАХ (срещу компютъра)
   Кой е на ход се смята от броя X и O на полето, затова
   компютърът физически не може да играе два пъти подред.
   ========================================================= */
const TicTacToe = {
  key: 'tictactoe',
  name: 'Морски шах',
  unit: 'победи',
  desc: 'Подреди три X в ред преди компютъра. Класацията е по победи.',
  help: ['Ти си X, компютърът е O', 'Кликни на празно поле или натисни цифра 1–9', 'Победа – 3 в ред, колона или диагонал', 'На „Трудно“ компютърът почти не греши'],
  LINES: [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]],
  level: 'hard',
  starter: 'player',

  mount(stage, api) {
    this.api = api;
    stage.innerHTML = `
      <div class="ttt-top">
        <div class="segmented" role="group" aria-label="Трудност">
          <button type="button" data-level="easy">Лесно</button>
          <button type="button" data-level="hard">Трудно</button>
        </div>
        <div class="segmented" role="group" aria-label="Кой започва">
          <button type="button" data-starter="player">Започвам аз</button>
          <button type="button" data-starter="computer">Компютърът</button>
        </div>
      </div>
      <div class="ttt-board">
        <div class="ttt" aria-label="Игрално поле за Морски шах"></div>
        <svg class="ttt-line" viewBox="0 0 300 300" aria-hidden="true"></svg>
      </div>
      <p class="muted small" id="tttStats"></p>
      <div class="game-buttons">
        <button type="button" class="btn btn--ghost btn--sm" data-ttt="new">Нова игра</button>
      </div>`;
    this.stage = stage;
    this.boardEl = stage.querySelector('.ttt');
    this.lineEl = stage.querySelector('.ttt-line');
    this.statsEl = stage.querySelector('#tttStats');
    this.boardEl.innerHTML = Array.from({ length: 9 }, (_, i) =>
      `<button type="button" class="ttt-cell" data-cell="${i}" aria-label="Поле ${i + 1}"></button>`).join('');

    stage.addEventListener('click', e => {
      const cell = e.target.closest('[data-cell]');
      if (cell) return this.play(Number(cell.dataset.cell));
      const lvl = e.target.closest('[data-level]');
      if (lvl) { this.level = lvl.dataset.level; return this.newGame(); }
      const st = e.target.closest('[data-starter]');
      if (st) { this.starter = st.dataset.starter; return this.newGame(); }
      if (e.target.closest('[data-ttt="new"]')) this.newGame();
    });
    this.newGame();
  },

  unmount() { clearTimeout(this.timer); },

  count(mark) { return this.board.filter(v => v === mark).length; },

  // Чий ход е според броя знаци на полето
  turn() {
    const x = this.count('X'), o = this.count('O');
    if (this.starter === 'player') return x === o ? 'X' : 'O';
    return o === x ? 'O' : 'X';
  },

  newGame() {
    clearTimeout(this.timer);
    this.board = Array(9).fill(null);
    this.over = false;
    this.lineEl.innerHTML = '';
    this.boardEl.classList.remove('is-over');
    this.stage.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('is-active', b.dataset.level === this.level));
    this.stage.querySelectorAll('[data-starter]').forEach(b => b.classList.toggle('is-active', b.dataset.starter === this.starter));
    this.api.setScore(Scores.tttStats(Auth.currentUser().id).wins);
    this.render();
    if (this.starter === 'computer') {
      this.api.message('Компютърът започва…');
      this.timer = setTimeout(() => this.computerMove(), 500);
    } else {
      this.api.message('Твой ред – ти си X.');
    }
  },

  winner(b) {
    for (const line of this.LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return { mark: b[a], line };
    }
    return b.every(Boolean) ? { mark: 'draw' } : null;
  },

  play(i) {
    if (this.over || this.board[i] || this.turn() !== 'X') return;
    this.board[i] = 'X';
    Sound.play('placeX');
    this.render(i);
    if (this.checkEnd()) return;
    this.api.message('Компютърът мисли…');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.computerMove(), 420);
  },

  computerMove() {
    if (this.over || this.turn() !== 'O') return;     // защита срещу двоен ход
    const free = this.board.map((v, i) => (v ? null : i)).filter(i => i !== null);
    if (!free.length) return;
    // „Лесно“ – случаен ход; „Трудно“ – minimax с малък шанс за грешка
    const move = this.level === 'easy' || Math.random() < 0.12
      ? free[Math.floor(Math.random() * free.length)]
      : this.bestMove();
    this.board[move] = 'O';
    Sound.play('placeO');
    this.render(move);
    if (!this.checkEnd()) this.api.message('Твой ред.');
  },

  // Minimax: пробва всички ходове докрай и избира най-добрия за O
  bestMove() {
    const score = (b, turn, depth) => {
      const w = this.winner(b);
      if (w) return w.mark === 'O' ? 10 - depth : w.mark === 'X' ? depth - 10 : 0;
      let best = turn === 'O' ? -Infinity : Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i]) continue;
        b[i] = turn;
        const s = score(b, turn === 'O' ? 'X' : 'O', depth + 1);
        b[i] = null;
        best = turn === 'O' ? Math.max(best, s) : Math.min(best, s);
      }
      return best;
    };
    let best = -Infinity, moves = [];
    for (let i = 0; i < 9; i++) {
      if (this.board[i]) continue;
      this.board[i] = 'O';
      const s = score(this.board, 'X', 1);
      this.board[i] = null;
      if (s > best) { best = s; moves = [i]; } else if (s === best) moves.push(i);
    }
    return moves[Math.floor(Math.random() * moves.length)];    // разнообразие между равни ходове
  },

  checkEnd() {
    const w = this.winner(this.board);
    if (!w) return false;
    this.over = true;
    this.boardEl.classList.add('is-over');
    if (w.line) this.drawWinLine(w.line);
    const result = w.mark === 'X' ? 1 : w.mark === 'draw' ? 0.5 : 0;
    Sound.play(w.mark === 'X' ? 'win' : w.mark === 'draw' ? 'draw' : 'lose');
    const res = this.api.finish(result);
    this.api.setScore(res.best ?? 0);
    this.api.message(w.mark === 'X' ? 'Победа!' : w.mark === 'draw' ? 'Равенство.' : 'Компютърът победи. Опитай пак!');
    this.render();
    return true;
  },

  // Зачертаваща линия през трите печеливши полета
  drawWinLine(line) {
    const center = i => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
    const [x1, y1] = center(line[0]), [x2, y2] = center(line[2]);
    const dx = (x2 - x1) * 0.18, dy = (y2 - y1) * 0.18;
    const win = this.board[line[0]] === 'X';
    this.lineEl.innerHTML = `<line x1="${x1 - dx}" y1="${y1 - dy}" x2="${x2 + dx}" y2="${y2 + dy}" class="${win ? 'is-x' : 'is-o'}"/>`;
  },

  // Рисува само новия знак (с анимация), останалите остават
  render(fresh = null) {
    this.boardEl.querySelectorAll('.ttt-cell').forEach((cell, i) => {
      const v = this.board[i];
      if (!v) { cell.innerHTML = ''; cell.className = 'ttt-cell'; }
      else if (i === fresh || !cell.firstChild) {
        cell.className = `ttt-cell ttt-cell--${v}`;
        cell.innerHTML = v === 'X'
          ? '<svg viewBox="0 0 100 100" aria-hidden="true"><path class="draw" d="M26 26L74 74"/><path class="draw draw--2" d="M74 26L26 74"/></svg>'
          : '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="draw" cx="50" cy="50" r="25" transform="rotate(-90 50 50)"/></svg>';
      }
      cell.disabled = !!v || this.over;
      cell.setAttribute('aria-label', `Поле ${i + 1}${v ? `: ${v}` : ''}`);
    });
    const s = Scores.tttStats(Auth.currentUser().id);
    this.statsEl.textContent = `${s.wins} победи · ${s.draws} равни · ${s.losses} загуби`;
  },

  onKey(e) {
    const n = Number(e.key);
    if (n >= 1 && n <= 9) { this.play(n - 1); return true; }
  }
};

const GAMES = { snake: SnakeGame, '2048': Game2048, tictactoe: TicTacToe };

/* =========================================================
   Страницата с игрите
   ========================================================= */
const GamesPage = {
  current: null,

  init() {
    const root = document.getElementById('view-games');
    // Бутон за звука (запомня се)
    const soundBtn = document.getElementById('soundToggle');
    const updateSoundBtn = () => {
      soundBtn.classList.toggle('is-off', !Sound.enabled);
      soundBtn.setAttribute('aria-pressed', String(Sound.enabled));
      soundBtn.title = Sound.enabled ? 'Изключи звука' : 'Включи звука';
    };
    soundBtn.addEventListener('click', () => {
      Sound.enabled = !Sound.enabled;
      updateSoundBtn();
      Sound.play('click');
    });
    updateSoundBtn();

    root.addEventListener('click', e => {
      const open = e.target.closest('[data-play]');
      if (open) { this.select(open.dataset.play); this.render(); }
      if (e.target.closest('[data-games-back]')) { this.select(null); this.render(); }
    });

    // Клавиатура – само когато игра е отворена и не пишем в поле
    document.addEventListener('keydown', e => {
      if (!this.current || document.getElementById('view-games').hidden) return;
      if (e.target.closest('input, textarea, select')) return;
      if (GAMES[this.current].onKey(e)) e.preventDefault();
    });

    // Пауза, ако прозорецът се скрие
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.current === 'snake' && SnakeGame.running && !SnakeGame.paused) {
        SnakeGame.onKey({ key: ' ' });
      }
    });
  },

  select(key) {
    if (this.current && this.current !== key) GAMES[this.current].unmount();
    this.current = key && GAMES[key] ? key : null;
    this.mounted = false;
  },

  stop() {
    if (this.current) GAMES[this.current].unmount();
    this.mounted = false;
  },

  render() {
    const home = document.getElementById('gamesHome');
    const room = document.getElementById('gameRoom');
    home.hidden = !!this.current;
    room.hidden = !this.current;
    if (!this.current) return this.renderHome();
    if (!this.mounted) this.mountGame();
    this.renderBoard();
  },

  renderHome() {
    const me = Auth.currentUser();
    const ids = [me.id, ...Friends.friendsOf(me.id)];
    document.getElementById('gamesHome').innerHTML = Object.values(GAMES).map(g => {
      const mine = Scores.best(me.id, g.key);
      const top = Scores.leaderboard(g.key, ids)[0];
      return `
        <article class="game-card game-card--${g.key}">
          <div class="game-art" aria-hidden="true">${this.art(g.key)}</div>
          <div class="game-card-body">
            <h2>${g.name}</h2>
            <p class="muted">${g.desc}</p>
            <dl class="game-facts">
              <div><dt>Твой рекорд</dt><dd>${mine ? `${mine} ${g.unit}` : '—'}</dd></div>
              <div><dt>Лидер сред приятелите</dt><dd>${top ? `${escapeHtml(top.user.name.split(' ')[0])} · ${top.best}` : '—'}</dd></div>
            </dl>
            <button type="button" class="btn btn--primary" data-play="${g.key}">Играй</button>
          </div>
        </article>`;
    }).join('');
  },

  // Малки картинки за картите (CSS + HTML, без външни файлове)
  art(key) {
    if (key === 'snake') {
      return `<div class="art-snake">${Array.from({ length: 6 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}<b></b></div>`;
    }
    if (key === '2048') {
      return `<div class="art-2048">${[2, 4, 8, 16, 32, 64, 128, 2048, 4].map(v => `<i class="tile--${v}">${v}</i>`).join('')}</div>`;
    }
    return `<div class="art-ttt">${['X', 'O', '', '', 'X', 'O', '', '', 'X'].map(v => `<i class="${v ? `m-${v}` : ''}">${v}</i>`).join('')}</div>`;
  },

  mountGame() {
    const g = GAMES[this.current];
    const me = Auth.currentUser();
    document.getElementById('gameTitle').textContent = g.name;
    document.getElementById('gameUnit').textContent = g.unit === 'победи' ? 'победи' : 'точки';
    document.getElementById('gameHelp').innerHTML = `
      <h3>Как се играе</h3>
      <ul>${g.help.map(h => `<li>${h}</li>`).join('')}</ul>`;
    const message = document.getElementById('gameMessage');
    const scoreEl = document.getElementById('gameScore');

    // Ново празно поле, за да не останат обработчици от предишната игра
    const oldStage = document.getElementById('gameStage');
    const stage = oldStage.cloneNode(false);
    oldStage.replaceWith(stage);

    g.mount(stage, {
      setScore: n => {
        if (scoreEl.textContent !== String(n)) {
          scoreEl.textContent = n;
          scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
        }
      },
      message: text => { message.textContent = text; },
      // Летящо „+n“ над точките
      popScore: n => {
        if (reduceMotion()) return;
        const pop = document.createElement('span');
        pop.className = 'score-pop';
        pop.textContent = `+${n}`;
        scoreEl.parentElement.appendChild(pop);
        setTimeout(() => pop.remove(), 800);
      },
      finish: score => {
        const res = Scores.add(me.id, g.key, score);
        this.renderBoard();
        if (res.isRecord && score > 0) {
          setTimeout(() => {
            Sound.play('record');
            celebrate(document.querySelector('.game-main'));
          }, g.key === 'tictactoe' ? 500 : 650);
          if (g.key !== 'tictactoe') showToast(`Нов личен рекорд в ${g.name}: ${res.best}!`);
        }
        return res;
      }
    });
    this.mounted = true;
  },

  // Класация: аз и приятелите ми
  renderBoard() {
    const g = GAMES[this.current];
    const me = Auth.currentUser();
    const rows = Scores.leaderboard(g.key, [me.id, ...Friends.friendsOf(me.id)]);
    const myBest = Scores.best(me.id, g.key);
    document.getElementById('gameBest').textContent = myBest ?? 0;

    document.getElementById('gameBoard').innerHTML = `
      <h3>Класация с приятели</h3>
      ${rows.length ? `<ol class="leaderboard">${rows.map((r, i) => `
        <li class="${r.user.id === me.id ? 'is-me' : ''}">
          <span class="rank rank--${i + 1}">${i + 1}</span>
          ${avatarHtml(r.user, 'avatar--sm')}
          <a href="#profile" class="user-link" data-user="${r.user.id}">${r.user.id === me.id ? 'Ти' : escapeHtml(r.user.name)}</a>
          <b>${r.best}</b>
        </li>`).join('')}</ol>`
        : `<p class="muted small">Още няма резултати. Изиграй игра и покани приятели да те бият.</p>`}
      ${Friends.friendsOf(me.id).length ? '' : `<p class="muted small">Класацията показва теб и приятелите ти. <a href="#friends">Намери приятели</a></p>`}`;
  }
};
