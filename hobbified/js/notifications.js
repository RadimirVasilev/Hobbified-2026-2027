/* =========================================================
   notifications.js – камбанката с известия в горната лента
   Самите известия се създават в data.js (при покана, коментар,
   харесване, рожден ден на приятел и нов рекорд в игра).
   ========================================================= */

const GAME_NAMES = { snake: 'Змия', '2048': '2048', tictactoe: 'Морски шах' };

const NotificationsUI = {
  init() {
    this.btn = document.getElementById('bellBtn');
    this.panel = document.getElementById('bellPanel');

    this.btn.addEventListener('click', e => {
      e.stopPropagation();
      this.panel.hidden ? this.open() : this.close();
    });

    this.panel.addEventListener('click', e => {
      if (e.target.closest('#markAllRead')) {
        Notifications.markAllRead(Auth.currentUser().id);
        this.render();
        return;
      }
      const item = e.target.closest('[data-notif]');
      if (!item) return;
      this.go(Notifications.all().find(n => n.id === item.dataset.notif));
      this.close();
    });

    document.addEventListener('click', e => {
      if (!this.panel.hidden && !e.target.closest('#bellPanel, #bellBtn')) this.close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  },

  open() {
    this.render();
    this.panel.hidden = false;
    this.btn.setAttribute('aria-expanded', 'true');
  },

  // При затваряне всичко показано се отбелязва като прочетено
  close() {
    if (this.panel.hidden) return;
    this.panel.hidden = true;
    this.btn.setAttribute('aria-expanded', 'false');
    const me = Auth.currentUser();
    if (me) Notifications.markAllRead(me.id);
    this.updateBadge();
  },

  updateBadge() {
    const me = Auth.currentUser();
    const n = me ? Notifications.unreadCount(me.id) : 0;
    const badge = document.getElementById('bellBadge');
    badge.textContent = n > 9 ? '9+' : n;
    badge.hidden = n === 0;
    this.btn.setAttribute('aria-label', n ? `Известия, ${n} нови` : 'Известия');
  },

  text(n, actor) {
    const name = `<b>${escapeHtml(actor.name)}</b>`;
    switch (n.type) {
      case 'friend_request': return `${name} ти изпрати покана за приятелство`;
      case 'friend_accept':  return `${name} прие поканата ти. Вече сте приятели.`;
      case 'comment':        return `${name} коментира публикацията ти: „${escapeHtml(n.text || '')}“`;
      case 'like':           return `${name} хареса публикацията ти`;
      case 'birthday':       return `Днес ${name} има рожден ден. Пожелай му/ѝ нещо!`;
      case 'game':           return `${name} те изпревари в ${GAME_NAMES[n.game]} с ${n.score} ${n.game === 'tictactoe' ? 'победи' : 'точки'}`;
      default:               return name;
    }
  },

  icon(type) {
    return {
      friend_request: '<path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M16 11h6"/>',
      friend_accept: '<path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 11l2 2 4-4"/>',
      comment: '<path d="M4 5h16v11H8l-4 4z"/>',
      like: '<path d="M12 20s-7-4.3-8.8-8.6C2 8.4 4 5 7.2 5c1.9 0 3.1 1 3.8 2.2h2C13.7 6 14.9 5 16.8 5 20 5 22 8.4 20.8 11.4 19 15.7 12 20 12 20z"/>',
      birthday: '<path d="M4 21h16v-8H4zM4 16h16M12 13V8M12 8c-1.5 0-2-1.2-2-2s2-3 2-3 2 2.2 2 3-.5 2-2 2z"/>',
      game: '<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3M16 12h.01M18.5 13.5h.01"/>'
    }[type] || '';
  },

  render() {
    const me = Auth.currentUser();
    if (!me) return;
    const list = Notifications.forUser(me.id)
      .map(n => ({ n, actor: Users.byId(n.actorId) }))
      .filter(x => x.actor && !x.actor.blocked)
      .slice(0, 30);
    const unread = list.filter(x => !x.n.read).length;

    this.panel.innerHTML = `
      <div class="bell-head">
        <h3>Известия</h3>
        ${unread ? `<button type="button" class="link-btn" id="markAllRead">Маркирай всички като прочетени</button>` : ''}
      </div>
      ${list.length ? `<ul class="bell-list">${list.map(({ n, actor }) => `
        <li>
          <button type="button" class="bell-item ${n.read ? '' : 'is-unread'}" data-notif="${n.id}">
            <span class="bell-avatar">${avatarHtml(actor, 'avatar--sm')}
              <span class="bell-type bell-type--${n.type}"><svg viewBox="0 0 24 24" aria-hidden="true">${this.icon(n.type)}</svg></span>
            </span>
            <span class="bell-text">${this.text(n, actor)}<small>${timeAgo(n.createdAt)}</small></span>
          </button>
        </li>`).join('')}</ul>`
        : `<p class="bell-empty">Нямаш известия. Тук ще виждаш покани, коментари, харесвания, рождени дни на приятели и нови рекорди в игрите.</p>`}
      <a href="#account" class="bell-foot" data-jump-settings>Настройки на известията</a>`;
  },

  // Къде води всяко известие
  go(n) {
    if (!n) return;
    if (n.type === 'friend_request') location.hash = '#friends';
    else if (n.type === 'game') { GamesPage.select(n.game); location.hash = '#games'; App.route(); }
    else if (n.type === 'comment' || n.type === 'like') { Profile.show(n.userId); location.hash = '#profile'; App.route(); }
    else { Profile.show(n.actorId); location.hash = '#profile'; App.route(); }
  }
};
