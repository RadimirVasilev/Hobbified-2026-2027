/* =========================================================
   sounds.js – звуци за мини игрите
   Звуците се създават с код (Web Audio API), затова не са нужни файлове.

   Ако искаш свои звуци (напр. направени в jsfxr или Audacity):
   1. Сложи ги в папка sounds/ до index.html (MP3 или WAV, под 1 секунда).
   2. Впиши ги в CUSTOM_SOUNDS по-долу, напр.  eat: 'sounds/eat.mp3'
   Звук, който е вписан тук, замества генерирания.
   ========================================================= */

const CUSTOM_SOUNDS = {
  // eat: 'sounds/eat.mp3',
  // gameover: 'sounds/gameover.mp3',
};

const Sound = {
  ctx: null,

  get enabled() { return Store.get('sound', true); },
  set enabled(v) { Store.set('sound', v); },

  // Браузърите позволяват звук само след действие на потребителя
  audio() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  /* Един тон: честота (Hz), продължителност (s), вид вълна, сила,
     честота в края (за плъзгащ звук) и закъснение */
  tone(freq, dur, { type = 'sine', vol = 0.18, to = null, delay = 0 } = {}) {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  notes(list, step = 0.09, opts = {}) {
    list.forEach((f, i) => this.tone(f, step * 1.6, { ...opts, delay: i * step }));
  },

  play(name, value = 0) {
    if (!this.enabled) return;
    if (CUSTOM_SOUNDS[name]) {
      const a = new Audio(CUSTOM_SOUNDS[name]);
      a.volume = 0.6;
      a.play().catch(() => {});
      return;
    }
    try {
      switch (name) {
        case 'click':    this.tone(700, 0.05, { type: 'triangle', vol: 0.08 }); break;
        case 'start':    this.notes([392, 523], 0.07, { type: 'triangle' }); break;
        case 'eat':      this.tone(520, 0.1, { type: 'square', vol: 0.08, to: 980 }); break;
        case 'gameover': this.tone(420, 0.45, { type: 'sawtooth', vol: 0.09, to: 90 }); break;
        case 'slide':    this.tone(200, 0.06, { type: 'triangle', vol: 0.06, to: 140 }); break;
        // по-голяма плочка = по-висок звук
        case 'merge':    this.tone(260 + Math.log2(value) * 55, 0.12, { type: 'triangle', vol: 0.12 }); break;
        case 'placeX':   this.tone(560, 0.09, { type: 'triangle', vol: 0.12, to: 640 }); break;
        case 'placeO':   this.tone(360, 0.09, { type: 'triangle', vol: 0.12, to: 300 }); break;
        case 'win':      this.notes([523, 659, 784, 1047], 0.09, { type: 'triangle' }); break;
        case 'lose':     this.notes([392, 330, 262], 0.13, { type: 'sawtooth', vol: 0.08 }); break;
        case 'draw':     this.notes([440, 440], 0.12, { type: 'triangle', vol: 0.1 }); break;
        case 'record':   this.notes([523, 659, 784, 1047, 1319], 0.08, { type: 'square', vol: 0.07 }); break;
      }
    } catch (e) { /* без звук, ако браузърът не позволява */ }
  }
};
