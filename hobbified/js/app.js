/* =========================================================
   app.js – стартиране, навигация между страниците и тема
   Навигацията е чрез # в адреса: #login, #register, #feed, #profile,
   #friends, #games, #admin (само за админ), #account (настройки)
   ========================================================= */

const App = {
  async start() {
    document.getElementById('loadError').hidden = true;
    Theme.init();
    await seedDemoData();

    Feed.init();
    Profile.init();
    Settings.init();
    FriendsPage.init();
    AdminPage.init();
    NotificationsUI.init();
    GamesPage.init();

    // Снимка на цял екран: затваряне с клик или Escape
    const lightbox = document.getElementById('lightbox');
    lightbox.addEventListener('click', e => {
      if (e.target.tagName === 'IMG') toggleLightboxZoom(e);
      else closeLightbox();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lightbox.hidden) closeLightbox(); });

    // Бутони „Играй“ извън страницата с игрите (напр. в началната)
    document.addEventListener('click', e => {
      const g = e.target.closest('[data-open-game]');
      if (!g) return;
      GamesPage.select(g.dataset.openGame);
      if (location.hash === '#games') this.route(); else location.hash = '#games';
    });
    this.bindAuthForms();

    // „Мини игри“ в менюто винаги отваря списъка с игрите
    document.querySelector('.nav-link[data-view="games"]').addEventListener('click', () => {
      GamesPage.select(null);
      if (location.hash === '#games') this.route();
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      GamesPage.select(null);
      Auth.logout();
      location.hash = '#login';
    });

    // Клик върху име на потребител отваря неговия профил
    document.addEventListener('click', e => {
      const link = e.target.closest('.user-link[data-user]');
      if (!link) return;
      Profile.show(link.dataset.user);
      if (location.hash === '#profile') this.route();
    });
    // Линкът „Профил“ в менюто винаги води към собствения профил
    document.querySelectorAll('.nav-link[data-view="profile"], [data-own-profile]').forEach(link =>
      link.addEventListener('click', () => {
        Profile.show(Auth.currentUser()?.id);
        if (location.hash === '#profile') this.route();
      }));

    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  route() {
    const me = Auth.currentUser();
    let view = location.hash.slice(1) || (me ? 'feed' : 'login');

    // Без вход може да се видят само страниците за вход и регистрация
    if (!me && !['login', 'register'].includes(view)) view = 'login';
    if (me && ['login', 'register'].includes(view)) view = 'feed';
    if (!['login', 'register', 'feed', 'profile', 'friends', 'games', 'admin', 'account'].includes(view)) view = me ? 'feed' : 'login';
    if (view === 'admin' && !Auth.isAdmin(me)) view = 'feed';

    document.getElementById('topbar').hidden = !me;
    document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
    document.querySelectorAll('.nav-link[data-view]').forEach(a =>
      a.classList.toggle('is-active', a.dataset.view === view));
    document.getElementById('settingsLink').classList.toggle('is-active', view === 'account');
    document.getElementById('adminLink').hidden = !Auth.isAdmin(me);
    updateFriendBadge();
    if (view !== 'games') GamesPage.stop();
    if (me) {
      Notifications.checkBirthdays(me);
      NotificationsUI.updateBadge();
    }

    if (view === 'login' || view === 'register') {
      document.getElementById('view-auth').hidden = false;
      document.getElementById('loginForm').hidden = view !== 'login';
      document.getElementById('registerForm').hidden = view !== 'register';
      document.querySelectorAll('[data-auth-tab]').forEach(t =>
        t.classList.toggle('is-active', t.dataset.authTab === view));
    } else if (view === 'feed') {
      document.getElementById('view-feed').hidden = false;
      Feed.render();
    } else if (view === 'profile') {
      if (!Profile.userId) Profile.show(me.id);
      document.getElementById('view-profile').hidden = false;
      Profile.render();
    } else if (view === 'friends') {
      document.getElementById('view-friends').hidden = false;
      FriendsPage.visited = false;
      FriendsPage.tab = 'requests';
      FriendsPage.render();
    } else if (view === 'games') {
      document.getElementById('view-games').hidden = false;
      GamesPage.render();
    } else if (view === 'admin') {
      document.getElementById('view-admin').hidden = false;
      AdminPage.render();
    } else if (view === 'account') {
      document.getElementById('view-account').hidden = false;
      Settings.render();
    }
    window.scrollTo(0, 0);
  },

  bindAuthForms() {
    const showError = (el, msg) => { el.textContent = msg; el.hidden = !msg; };

    document.getElementById('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const error = document.getElementById('loginError');
      try {
        await Auth.login(f.username.value, f.password.value);
        showError(error, '');
        f.reset();
        Profile.show(Auth.currentUser().id);
        location.hash = '#feed';
        this.route();
      } catch (err) {
        showError(error, err.message);
      }
    });

    document.getElementById('registerForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const error = document.getElementById('registerError');
      try {
        await Auth.register({
          name: f.name.value, username: f.username.value, email: f.email.value,
          password: f.password.value, password2: f.password2.value
        });
        showError(error, '');
        f.reset();
        // След регистрация – директно към профила, за да добави хобита
        Profile.show(Auth.currentUser().id);
        location.hash = '#profile';
        this.route();
        showToast('Добре дошъл! Започни с хобитата си.');
      } catch (err) {
        showError(error, err.message);
      }
    });
  }
};

/* ---------- Светла / тъмна тема ---------- */
const Theme = {
  icons: {
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>'
  },

  init() {
    const saved = Store.get('theme', null);
    if (saved) document.documentElement.dataset.theme = saved;
    this.updateButton();
    document.getElementById('themeToggle').addEventListener('click', () => this.toggle());
    // При „Като устройството“ следим и промяната на темата на системата
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.updateButton());
  },

  // 'light', 'dark' или 'system'
  mode() {
    return Store.get('theme', null) || 'system';
  },

  set(mode) {
    if (mode === 'system') {
      delete document.documentElement.dataset.theme;
      Store.remove('theme');
    } else {
      document.documentElement.dataset.theme = mode;
      Store.set('theme', mode);
    }
    this.updateButton();
  },

  current() {
    return document.documentElement.dataset.theme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  },

  toggle() {
    this.set(this.current() === 'dark' ? 'light' : 'dark');
    document.querySelectorAll('input[name="themeMode"]').forEach(r => { r.checked = r.value === this.mode(); });
  },

  updateButton() {
    // Показваме иконата на темата, към която ще превключим
    document.getElementById('themeToggle').innerHTML = this.current() === 'dark' ? this.icons.light : this.icons.dark;
  }
};

App.start();
