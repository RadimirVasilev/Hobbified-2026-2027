/* =========================================================
   data.js – слой за данни
   Засега всичко се пази в localStorage на браузъра.
   По-късно тези функции ще се заменят с заявки към сървъра
   (Node.js + SQL Server), а останалият код няма да се променя.
   ========================================================= */

/* Категории хобита.
   hue      – оттенък на цвета на категорията (0–360)
   options  – готов списък, от който потребителят избира с отметки
   Потребителят може да добави и свой вариант, ако го няма в списъка. */
const HOBBY_CATEGORIES = {
  games: {
    name: 'Компютърни игри', itemsLabel: 'Любими игри', hue: 210,
    options: ['League of Legends', 'Valorant', 'Counter-Strike 2', 'Dota 2', 'Minecraft', 'Fortnite', 'GTA V',
      'EA Sports FC', 'Call of Duty', 'Apex Legends', 'Rocket League', 'Overwatch 2', 'Rainbow Six Siege',
      'PUBG', 'World of Warcraft', 'Roblox', 'Elden Ring', 'The Witcher 3', 'Stardew Valley', 'Terraria',
      'Among Us', 'Hearthstone', 'Teamfight Tactics', 'The Sims 4']
  },
  music: {
    name: 'Музика', itemsLabel: 'Любими жанрове', hue: 330,
    options: ['Рок', 'Метъл', 'Поп', 'Хип-хоп', 'Рап', 'Електронна', 'Техно', 'Хаус', 'Drum & Bass', 'Джаз',
      'Блус', 'Класическа', 'Поп-фолк', 'Народна', 'Инди', 'R&B', 'Пънк', 'Реге', 'Lo-fi', 'K-pop']
  },
  instruments: {
    name: 'Музикални инструменти', itemsLabel: 'На какво свириш', hue: 290,
    options: ['Китара', 'Електрическа китара', 'Бас китара', 'Пиано', 'Синтезатор', 'Барабани', 'Цигулка',
      'Укулеле', 'Саксофон', 'Тромпет', 'Гайда', 'Кавал', 'Вокал', 'DJ', 'Музикална продукция']
  },
  sports: {
    name: 'Спорт', itemsLabel: 'Кои спортове', hue: 25,
    options: ['Футбол', 'Баскетбол', 'Волейбол', 'Хандбал', 'Тенис', 'Тенис на маса', 'Бадминтон', 'Плуване',
      'Бягане', 'Колоездене', 'Фитнес', 'Кросфит', 'Калистеника', 'Бокс', 'Кикбокс', 'ММА', 'Карате', 'Джудо',
      'Борба', 'Ски', 'Сноуборд', 'Скейтборд', 'Катерене', 'Йога']
  },
  fishing: {
    name: 'Риболов', itemsLabel: 'Видове риболов', hue: 185,
    options: ['Шаранджийски риболов', 'Спининг', 'Фидер', 'Мухарски риболов', 'Риболов на плувка',
      'Риболов на хищник', 'Морски риболов', 'Нощен риболов', 'Подледен риболов', 'Риболов от лодка']
  },
  outdoor: {
    name: 'Природа и туризъм', itemsLabel: 'Какво правиш навън', hue: 130,
    options: ['Планинарство', 'Къмпинг', 'Алпинизъм', 'Пещерняшство', 'Каяк', 'Рафтинг', 'Наблюдение на птици',
      'Гъби и билки', 'Лов', 'Ориентиране', 'Парапланеризъм', 'Гмуркане']
  },
  books: {
    name: 'Книги', itemsLabel: 'Любими жанрове', hue: 45,
    options: ['Фентъзи', 'Научна фантастика', 'Криминални', 'Трилъри', 'Хорър', 'Романтика', 'Исторически',
      'Класика', 'Българска литература', 'Поезия', 'Манга', 'Комикси', 'Биографии', 'Самоусъвършенстване', 'Философия']
  },
  movies: {
    name: 'Филми и сериали', itemsLabel: 'Любими жанрове', hue: 260,
    options: ['Екшън', 'Комедия', 'Драма', 'Хорър', 'Трилър', 'Научна фантастика', 'Фентъзи', 'Анимация',
      'Аниме', 'Документални', 'Криминални', 'Романтични', 'Супергерои', 'Ситкоми', 'Риалити']
  },
  art: {
    name: 'Изкуство и занаяти', itemsLabel: 'Техники', hue: 0,
    options: ['Рисуване с молив', 'Акварел', 'Маслени бои', 'Дигитално рисуване', 'Графити', 'Фотография',
      'Видеомонтаж', 'Скулптура', 'Керамика', 'Калиграфия', 'Плетене', 'Бродерия', '3D моделиране', 'Дърворезба']
  },
  cooking: {
    name: 'Готвене', itemsLabel: 'Любими кухни и неща', hue: 95,
    options: ['Българска кухня', 'Италианска кухня', 'Азиатска кухня', 'Мексиканска кухня', 'Барбекю и скара',
      'Сладкарство', 'Печене на хляб', 'Веган кухня', 'Здравословно хранене', 'Коктейли', 'Кафе', 'Домашна ракия и вино']
  },
  tech: {
    name: 'Технологии', itemsLabel: 'С какво се занимаваш', hue: 195,
    options: ['Програмиране', 'Уеб разработка', 'Разработка на игри', 'Сглобяване на компютри', 'Електроника',
      'Arduino', 'Raspberry Pi', '3D принтиране', 'Роботика', 'Изкуствен интелект', 'Киберсигурност', 'Linux']
  },
  cars: {
    name: 'Коли и мотори', itemsLabel: 'Какво те вълнува', hue: 350,
    options: ['Тунинг', 'Дрифт', 'Ретро автомобили', 'Мотоциклети', 'Картинг', 'Формула 1', 'Рали', 'MotoGP',
      'Ремонт на коли', 'Офроуд', 'Електромобили']
  },
  boardgames: {
    name: 'Настолни игри', itemsLabel: 'Любими игри', hue: 160,
    options: ['Шах', 'Белот', 'Табла', 'Покер', 'Монополи', 'Catan', 'Dungeons & Dragons', 'Magic: The Gathering',
      'Pokémon TCG', 'Уно', 'Активити', 'Пъзели', 'Рубик куб']
  },
  pets: {
    name: 'Домашни любимци', itemsLabel: 'Какви животни', hue: 30,
    options: ['Кучета', 'Котки', 'Аквариумни рибки', 'Папагали', 'Влечуги', 'Гризачи', 'Коне', 'Зайци']
  },
  garden: {
    name: 'Градина и стопанство', itemsLabel: 'С какво се занимаваш', hue: 70,
    options: ['Пчеларство', 'Градинарство', 'Зеленчуци', 'Овощарство', 'Цветя', 'Стайни растения', 'Бонсай',
      'Билки', 'Отглеждане на кокошки', 'Лозарство', 'Компостиране', 'Оранжерия']
  },
  travel: {
    name: 'Пътуване', itemsLabel: 'Как пътуваш', hue: 225,
    options: ['Градски туризъм', 'Плажни почивки', 'Бекпакинг', 'Пътуване с кемпер', 'Мото пътешествия',
      'Пътуване с влак', 'Европа', 'Азия', 'Америка', 'Пътуване из България']
  }
};

const HOBBY_LEVELS = ['Начинаещ', 'Любител', 'Напреднал', 'Професионалист'];

const LOOKING_FOR = {
  friends:   'Нови приятели',
  team:      'Съотборници за игри',
  company:   'Компания за хобито',
  learn:     'Някой, който да ме научи',
  teach:     'Да уча другите'
};

/* Настройки по подразбиране за всеки нов профил */
const DEFAULT_SETTINGS = {
  birthdayVisibility: 'dayMonth',  // 'full' | 'dayMonth' | 'hidden'
  showAge: true,
  showCity: true,
  profileVisibility: 'everyone',   // 'everyone' | 'friends'
  notifications: { friendRequests: true, comments: true, likes: true, birthdays: true, games: true }
};

const BG_CITIES = ['София', 'Пловдив', 'Варна', 'Бургас', 'Русе', 'Стара Загора', 'Плевен', 'Сливен', 'Добрич',
  'Шумен', 'Перник', 'Хасково', 'Ямбол', 'Пазарджик', 'Благоевград', 'Велико Търново', 'Враца', 'Габрово',
  'Видин', 'Монтана', 'Кърджали', 'Ловеч', 'Кюстендил', 'Търговище', 'Силистра', 'Разград', 'Смолян'];

/* ---------- Store: обвивка около localStorage ----------
   Ако localStorage не е достъпен (частен прозорец и др.),
   данните остават в паметта, докато страницата е отворена. */
const memory = {};
const Store = {
  get(key, fallback) {
    if (key in memory) return memory[key];
    try {
      const raw = localStorage.getItem('hobbified_' + key);
      if (raw !== null) {
        memory[key] = JSON.parse(raw);
        return memory[key];
      }
    } catch (e) { /* няма достъп до хранилището */ }
    return fallback;
  },
  // Връща false, ако браузърът няма място (снимките заемат най-много)
  set(key, value) {
    memory[key] = value;
    try {
      localStorage.setItem('hobbified_' + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return !(e && (e.name === 'QuotaExceededError' || e.code === 22));
    }
  },
  remove(key) {
    delete memory[key];
    try { localStorage.removeItem('hobbified_' + key); } catch (e) {}
  }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Хеширане на парола (SHA-256) ----------
   В истинското приложение хеширането ще става на сървъра. */
async function hashPassword(password) {
  if (window.crypto && crypto.subtle) {
    const bytes = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Резервен вариант, ако браузърът няма crypto.subtle
  let h = 0;
  for (const ch of password) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return 'x' + (h >>> 0).toString(16);
}

/* ---------- Потребители ---------- */
const Users = {
  all()            { return Store.get('users', []).map(withDefaults); },
  saveAll(users)   { return Store.set('users', users); },
  byId(id)         { return this.all().find(u => u.id === id) || null; },
  byUsername(name) { return this.all().find(u => u.username === name.toLowerCase()) || null; },
  byEmail(email)   { return this.all().find(u => u.email === email.toLowerCase()) || null; },

  create(user) {
    const users = this.all();
    users.push(withDefaults(user));
    this.saveAll(users);
    return user;
  },

  update(id, changes) {
    const before = this.all();
    if (!this.saveAll(before.map(u => (u.id === id ? { ...u, ...changes } : u)))) {
      this.saveAll(before);
      throw new Error('Няма място в браузъра. Опитай с по-малка снимка.');
    }
    return this.byId(id);
  },

  // Изтрива профила заедно с публикациите, харесванията и коментарите му
  remove(id) {
    this.saveAll(this.all().filter(u => u.id !== id));
    Friends.saveAll(Friends.all().filter(f => f.from !== id && f.to !== id));
    Posts.saveAll(Posts.all()
      .filter(p => p.authorId !== id)
      .map(p => ({
        ...p,
        likes: p.likes.filter(uid => uid !== id),
        comments: p.comments.filter(c => c.authorId !== id)
      })));
  }
};

// Гарантира, че и по-старите профили имат всички полета
function withDefaults(u) {
  u = migrateHobbies(u);
  return {
    bio: '', city: '', birthDate: null, lookingFor: [], hobbies: {}, hobbyLevels: {},
    role: 'user', blocked: false,
    ...u,
    settings: { ...DEFAULT_SETTINGS, ...(u.settings || {}),
      notifications: { ...DEFAULT_SETTINGS.notifications, ...((u.settings || {}).notifications || {}) } },
    // премахваме категории, които вече не съществуват
    hobbies: Object.fromEntries(Object.entries(u.hobbies || {}).filter(([k]) => HOBBY_CATEGORIES[k]))
  };
}

/* Пчеларството беше по погрешка в „Домашни любимци“.
   Ако някой го има там, го местим в „Градина и стопанство“. */
function migrateHobbies(u) {
  const pets = u.hobbies?.pets;
  if (!pets || !pets.includes('Пчеларство')) return u;
  const hobbies = { ...u.hobbies, pets: pets.filter(x => x !== 'Пчеларство') };
  const levels = { ...(u.hobbyLevels || {}) };
  if (!hobbies.pets.length) { delete hobbies.pets; delete levels.pets; }
  hobbies.garden = [...new Set([...(hobbies.garden || []), 'Пчеларство'])];
  return { ...u, hobbies, hobbyLevels: levels };
}

/* ---------- Публикации ---------- */
const Posts = {
  all()          { return Store.get('posts', []); },
  saveAll(posts) { return Store.set('posts', posts); },

  // Най-новите първи; публикациите на блокирани потребители не се показват
  newestFirst() {
    const blocked = new Set(Users.all().filter(u => u.blocked).map(u => u.id));
    return this.all().filter(p => !blocked.has(p.authorId)).sort((a, b) => b.createdAt - a.createdAt);
  },

  create(authorId, text, hobby, image = null) {
    const post = { id: generateId(), authorId, text, hobby, image, createdAt: Date.now(), likes: [], comments: [] };
    const before = this.all();
    if (!this.saveAll([...before, post])) {
      this.saveAll(before);
      throw new Error('Няма място в браузъра за още снимки. Изтрий стари публикации със снимки или пусни тази без снимка.');
    }
    return post;
  },

  remove(postId) {
    this.saveAll(this.all().filter(p => p.id !== postId));
  },

  toggleLike(postId, userId) {
    const posts = this.all().map(p => {
      if (p.id !== postId) return p;
      const liked = p.likes.includes(userId);
      if (!liked) Notifications.add(p.authorId, 'like', userId, { postId });
      return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId] };
    });
    this.saveAll(posts);
  },

  removeComment(postId, commentId) {
    this.saveAll(this.all().map(p => p.id !== postId ? p
      : { ...p, comments: p.comments.filter(c => c.id !== commentId) }));
  },

  addComment(postId, authorId, text) {
    const posts = this.all().map(p => {
      if (p.id !== postId) return p;
      const comment = { id: generateId(), authorId, text, createdAt: Date.now() };
      Notifications.add(p.authorId, 'comment', authorId, { postId, text: text.slice(0, 60) });
      return { ...p, comments: [...p.comments, comment] };
    });
    this.saveAll(posts);
  }
};

/* ---------- Приятелства ----------
   Всяка връзка е { id, from, to, status, createdAt }
   status: 'pending' – чака отговор от „to“, 'accepted' – приятели */
const Friends = {
  all()        { return Store.get('friendships', []); },
  saveAll(arr) { Store.set('friendships', arr); },

  find(a, b) {
    return this.all().find(f => (f.from === a && f.to === b) || (f.from === b && f.to === a)) || null;
  },

  // 'none' | 'friends' | 'sent' (аз съм поканил) | 'received' (поканен съм)
  status(me, other) {
    const f = this.find(me, other);
    if (!f) return 'none';
    if (f.status === 'accepted') return 'friends';
    return f.from === me ? 'sent' : 'received';
  },

  request(from, to) {
    if (from === to || this.find(from, to)) return;
    this.saveAll([...this.all(), { id: generateId(), from, to, status: 'pending', createdAt: Date.now() }]);
    Notifications.add(to, 'friend_request', from);
  },

  accept(me, other) {
    this.saveAll(this.all().map(f =>
      f.from === other && f.to === me && f.status === 'pending' ? { ...f, status: 'accepted', acceptedAt: Date.now() } : f));
    Notifications.add(other, 'friend_accept', me);
    // Поканата вече е приета – известието за нея не е нужно
    Notifications.removeWhere(n => n.userId === me && n.type === 'friend_request' && n.actorId === other);
  },

  // Отказ, отмяна на покана или премахване на приятел – все едно трие връзката
  remove(a, b) {
    this.saveAll(this.all().filter(f => !((f.from === a && f.to === b) || (f.from === b && f.to === a))));
  },

  friendsOf(id) {
    return this.all().filter(f => f.status === 'accepted' && (f.from === id || f.to === id))
      .map(f => (f.from === id ? f.to : f.from));
  },

  incoming(id) { return this.all().filter(f => f.status === 'pending' && f.to === id).map(f => f.from); },
  outgoing(id) { return this.all().filter(f => f.status === 'pending' && f.from === id).map(f => f.to); }
};

/* ---------- Известия ----------
   { id, userId (получател), type, actorId (кой го е предизвикал), postId?, text?, game?, read, createdAt }
   Всеки тип се включва/изключва от Настройки → Известия. */
const NOTIFY_SETTING = {
  friend_request: 'friendRequests',
  friend_accept: 'friendRequests',
  comment: 'comments',
  like: 'likes',
  birthday: 'birthdays',
  game: 'games'
};

const Notifications = {
  all()        { return Store.get('notifications', []); },
  saveAll(arr) { return Store.set('notifications', arr); },

  add(userId, type, actorId, extra = {}) {
    if (!userId || userId === actorId) return;          // не известяваме човек за собствено действие
    const user = Users.byId(userId);
    if (!user || user.blocked) return;
    if (user.settings.notifications[NOTIFY_SETTING[type]] === false) return;
    if (extra.key && this.all().some(n => n.key === extra.key)) return;  // без повторения

    const list = [{ id: generateId(), userId, type, actorId, read: false, createdAt: Date.now(), ...extra }, ...this.all()];
    this.saveAll(list.slice(0, 300));                    // пазим най-много 300
  },

  forUser(userId) {
    return this.all().filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  },

  unreadCount(userId) {
    return this.all().filter(n => n.userId === userId && !n.read).length;
  },

  markAllRead(userId) {
    this.saveAll(this.all().map(n => (n.userId === userId ? { ...n, read: true } : n)));
  },

  removeWhere(test) {
    this.saveAll(this.all().filter(n => !test(n)));
  },

  // Веднъж на ден: известие за приятели с рожден ден днес
  checkBirthdays(me) {
    const today = new Date();
    for (const id of Friends.friendsOf(me.id)) {
      const friend = Users.byId(id);
      if (!friend || !friend.birthDate || friend.settings.birthdayVisibility === 'hidden') continue;
      const [, m, d] = friend.birthDate.split('-').map(Number);
      if (m === today.getMonth() + 1 && d === today.getDate()) {
        this.add(me.id, 'birthday', id, { key: `bday-${me.id}-${id}-${today.getFullYear()}` });
      }
    }
  }
};

/* ---------- Резултати от мини игрите ----------
   { id, userId, game, score, createdAt }
   За Морски шах score е 1 при победа, 0.5 при равенство, 0 при загуба. */
const Scores = {
  all()        { return Store.get('scores', []); },
  saveAll(arr) { return Store.set('scores', arr); },

  best(userId, game) {
    const mine = this.all().filter(s => s.userId === userId && s.game === game);
    if (!mine.length) return null;
    return game === 'tictactoe' ? mine.filter(s => s.score === 1).length : Math.max(...mine.map(s => s.score));
  },

  tttStats(userId) {
    const mine = this.all().filter(s => s.userId === userId && s.game === 'tictactoe');
    return { wins: mine.filter(s => s.score === 1).length, draws: mine.filter(s => s.score === 0.5).length, losses: mine.filter(s => s.score === 0).length };
  },

  /* Записва резултат. Ако е нов личен рекорд, известява приятелите,
     които са били пред мен в класацията и вече съм ги изпреварил. */
  add(userId, game, score) {
    const previous = this.best(userId, game);
    this.saveAll([...this.all(), { id: generateId(), userId, game, score, createdAt: Date.now() }].slice(-2000));
    const now = this.best(userId, game);
    const isRecord = now !== null && (previous === null || now > previous);
    if (isRecord && now > 0) {
      for (const fid of Friends.friendsOf(userId)) {
        const theirs = this.best(fid, game);
        if (theirs !== null && theirs >= (previous ?? 0) && theirs < now) {
          Notifications.add(fid, 'game', userId, { game, score: now });
        }
      }
    }
    return { isRecord, best: now };
  },

  // Класация: най-добрият резултат на всеки от дадените хора
  leaderboard(game, userIds) {
    return userIds
      .map(id => ({ user: Users.byId(id), best: this.best(id, game) }))
      .filter(r => r.user && !r.user.blocked && r.best !== null && r.best > 0)
      .sort((a, b) => b.best - a.best);
  }
};

/* ---------- Общи хобита и предложения за приятели ----------
   Точки: всяко общо конкретно нещо (напр. Minecraft) = 3 точки,
   всяка обща категория (напр. Компютърни игри) = 1 точка. */
function commonHobbies(a, b) {
  const items = [];
  const categories = [];
  for (const [cat, list] of Object.entries(a.hobbies)) {
    const other = b.hobbies[cat];
    if (!other) continue;
    categories.push(cat);
    const lower = other.map(x => x.toLowerCase());
    for (const item of list) if (lower.includes(item.toLowerCase())) items.push({ cat, item });
  }
  return { items, categories, score: items.length * 3 + categories.length };
}

function friendSuggestions(me, limit = 10) {
  return Users.all()
    .filter(u => u.id !== me.id && !u.blocked && u.role !== 'admin' && Friends.status(me.id, u.id) === 'none')
    .map(u => ({ user: u, common: commonHobbies(me, u) }))
    .filter(s => s.common.score > 0)
    .sort((a, b) => b.common.score - a.common.score)
    .slice(0, limit);
}

/* ---------- Пробни данни ---------- */
async function seedDemoData() {
  if (Store.get('seed_version', 0) >= 5) return;

  const pass = await hashPassword('demo123');
  const adminPass = await hashPassword('admin123');
  const now = Date.now();
  const hour = 3600 * 1000;

  const demoUsers = [
    {
      id: 'u1', name: 'Никола Димитров', username: 'niki.gamer', email: 'niki@example.com',
      bio: 'Играя от 8-годишен. Търся отбор за ranked вечерите.', city: 'Пловдив', birthDate: '2007-11-12',
      lookingFor: ['team', 'friends'],
      hobbies: { games: ['League of Legends', 'Valorant', 'Minecraft'], music: ['Метъл', 'Рок'], tech: ['Сглобяване на компютри'] },
      hobbyLevels: { games: 'Напреднал', music: 'Любител', tech: 'Любител' }
    },
    {
      id: 'u2', name: 'Мария Петрова', username: 'maria.p', email: 'maria@example.com',
      bio: 'Рисувам, слушам музика и строя ферми в Stardew Valley.', city: 'София', birthDate: '2008-03-21',
      lookingFor: ['friends', 'company'],
      hobbies: { music: ['Инди', 'Поп'], games: ['Stardew Valley', 'Minecraft'], art: ['Акварел', 'Дигитално рисуване'], instruments: ['Укулеле'] },
      hobbyLevels: { music: 'Любител', games: 'Любител', art: 'Напреднал', instruments: 'Начинаещ' }
    },
    {
      id: 'u3', name: 'Георги Иванов', username: 'gosho_riba', email: 'georgi@example.com',
      bio: 'Всяка събота съм на язовира от 5 сутринта.', city: 'Враца', birthDate: '1994-07-05',
      lookingFor: ['company', 'teach'],
      hobbies: { fishing: ['Шаранджийски риболов', 'Спининг', 'Фидер'], cooking: ['Барбекю и скара'], outdoor: ['Къмпинг'] },
      hobbyLevels: { fishing: 'Професионалист', cooking: 'Любител', outdoor: 'Напреднал' }
    },
    {
      id: 'u4', name: 'Виктория Стоянова', username: 'viki.s', email: 'viki@example.com',
      bio: 'Волейбол през седмицата, планина през уикенда.', city: 'Пловдив', birthDate: '2007-09-02',
      lookingFor: ['friends', 'company'],
      hobbies: { sports: ['Волейбол', 'Бягане', 'Йога'], outdoor: ['Планинарство', 'Къмпинг'], music: ['Поп', 'Инди'] },
      hobbyLevels: { sports: 'Напреднал', outdoor: 'Любител' }
    },
    {
      id: 'u5', name: 'Димитър Колев', username: 'mitko.dev', email: 'mitko@example.com',
      bio: 'Пиша код, сглобявам компютри и играя LoL с приятели.', city: 'София', birthDate: '2006-01-17',
      lookingFor: ['team', 'teach'],
      hobbies: { games: ['League of Legends', 'Counter-Strike 2', 'Minecraft'], tech: ['Програмиране', 'Сглобяване на компютри', 'Arduino'] },
      hobbyLevels: { games: 'Напреднал', tech: 'Напреднал' }
    },
    {
      id: 'admin', name: 'Администратор', username: 'admin', email: 'admin@hobbified.bg', role: 'admin',
      bio: 'Модератор на Hobbified. Пиши ми, ако видиш нещо нередно.', city: '', birthDate: null,
      lookingFor: [], hobbies: {}, hobbyLevels: {}
    }
  ];

  // Обновяваме пробните профили, без да пипаме профилите, създадени от потребителя
  const users = Store.get('users', []);
  for (const demo of demoUsers) {
    const i = users.findIndex(u => u.id === demo.id);
    const full = { ...demo, passwordHash: demo.id === 'admin' ? adminPass : pass, createdAt: now - 30 * 24 * hour };
    if (i >= 0) { users[i] = { ...users[i], ...demo }; delete users[i].birthYear; }
    else users.push(full);
  }
  Users.saveAll(users);

  // Пробни приятелства: Никола и Димитър са приятели, Виктория е поканила Мария
  if (!Store.get('friends_seeded', false)) {
    const existing = Friends.all();
    const add = (from, to, status) => {
      if (!existing.some(f => (f.from === from && f.to === to) || (f.from === to && f.to === from))) {
        existing.push({ id: generateId(), from, to, status, createdAt: now - 3 * 24 * hour });
      }
    };
    add('u1', 'u5', 'accepted');
    add('u2', 'u1', 'accepted');
    add('u4', 'u2', 'pending');
    add('u5', 'u2', 'pending');
    Friends.saveAll(existing);
    Store.set('friends_seeded', true);
  }

  if (!Store.get('seeded', false)) {
    Posts.saveAll([
      { id: 'p1', authorId: 'u3', hobby: 'fishing', createdAt: now - 2 * hour,
        text: 'Шаран от 8,4 кг тази сутрин на Огоста. Захапа на царевица в 6:15. Някой ходил ли е скоро на Искъра?',
        likes: ['u1', 'u2'], comments: [{ id: 'c1', authorId: 'u1', text: 'Звяр! Каква въдица ползваш?', createdAt: now - hour }] },
      { id: 'p2', authorId: 'u1', hobby: 'games', createdAt: now - 5 * hour,
        text: 'Търся двама за Valorant довечера след 21:00. Gold–Platinum, с микрофон.', likes: [], comments: [] },
      { id: 'p3', authorId: 'u2', hobby: 'games', createdAt: now - 26 * hour,
        text: 'Най-после завърших общинския център в Stardew Valley. 112 часа игра.', likes: ['u1'], comments: [] },
      { id: 'p4', authorId: 'u2', hobby: 'art', createdAt: now - 50 * hour,
        text: 'Първият ми акварел с планински пейзаж. Още уча как се прави небе без петна.', likes: ['u3'], comments: [] }
    ]);
    Store.set('seeded', true);
  }
  // Публикации от новите пробни профили
  const posts = Posts.all();
  const extra = [
    { id: 'p5', authorId: 'u4', hobby: 'outdoor', createdAt: now - 8 * hour,
      text: 'Събота отиваме към хижа Здравец. Тръгваме в 8:00 от Пловдив, има места в колата.', likes: ['u2'], comments: [] },
    { id: 'p6', authorId: 'u5', hobby: 'tech', createdAt: now - 30 * hour,
      text: 'Сглобих първия си компютър с водно охлаждане. Температурите паднаха с 15 градуса.', likes: ['u1'],
      comments: [{ id: 'c2', authorId: 'u1', text: 'Снимки или не се е случило!', createdAt: now - 28 * hour }] }
  ];
  for (const post of extra) if (!posts.some(p => p.id === post.id)) posts.push(post);
  Posts.saveAll(posts);

  // Известия за пробните покани за приятелство
  for (const f of Friends.all().filter(f => f.status === 'pending')) {
    Notifications.add(f.to, 'friend_request', f.from, { key: `seed-req-${f.id}` });
  }

  // Пробни резултати от игрите
  if (!Store.get('scores_seeded', false)) {
    const day = 24 * hour;
    Scores.saveAll([
      ...Scores.all(),
      { id: 's1', userId: 'u1', game: 'snake', score: 23, createdAt: now - 2 * day },
      { id: 's2', userId: 'u5', game: 'snake', score: 31, createdAt: now - day },
      { id: 's3', userId: 'u2', game: 'snake', score: 12, createdAt: now - 3 * day },
      { id: 's4', userId: 'u1', game: '2048', score: 4820, createdAt: now - day },
      { id: 's5', userId: 'u2', game: '2048', score: 7316, createdAt: now - 2 * day },
      { id: 's6', userId: 'u4', game: '2048', score: 2104, createdAt: now - 4 * day },
      { id: 's7', userId: 'u5', game: 'tictactoe', score: 1, createdAt: now - day },
      { id: 's8', userId: 'u5', game: 'tictactoe', score: 1, createdAt: now - day },
      { id: 's9', userId: 'u1', game: 'tictactoe', score: 1, createdAt: now - day }
    ]);
    Store.set('scores_seeded', true);
  }

  Store.set('seed_version', 5);
}
