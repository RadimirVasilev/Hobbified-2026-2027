/* =========================================================
   friends.js – приятелства
   Бутоните за покана/приемане/отказ, карта „предложение“
   и страницата „Приятели“ (#friends) с четири раздела.
   ========================================================= */

/* Бутон(и) според връзката между мен и другия потребител */
function friendButtonHtml(me, other, small = false) {
  const size = small ? 'btn--sm' : '';
  const id = other.id;
  switch (Friends.status(me.id, other.id)) {
    case 'friends':
      return `<div class="friend-actions">
        <span class="friend-state">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>Приятели
        </span>
        <button type="button" class="btn btn--ghost ${size}" data-friend="remove" data-id="${id}">Премахни</button>
      </div>`;
    case 'sent':
      return `<div class="friend-actions">
        <span class="friend-state friend-state--wait">Поканата е изпратена</span>
        <button type="button" class="btn btn--ghost ${size}" data-friend="cancel" data-id="${id}">Отмени</button>
      </div>`;
    case 'received':
      return `<div class="friend-actions">
        <button type="button" class="btn btn--primary ${size}" data-friend="accept" data-id="${id}">Приеми</button>
        <button type="button" class="btn btn--ghost ${size}" data-friend="decline" data-id="${id}">Откажи</button>
      </div>`;
    default:
      return `<button type="button" class="btn btn--primary ${size}" data-friend="add" data-id="${id}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Добави приятел</button>`;
  }
}

/* Карта на човек: аватар, име, общи хобита и бутон */
function suggestionHtml({ user, common }, compact = false) {
  const me = Auth.currentUser();
  const shown = common.items.slice(0, compact ? 2 : 4);
  const more = common.items.length - shown.length;
  const onlyCats = !common.items.length && common.categories.length;
  const d = visibleDetails(user, me);

  return `
    <li class="person ${compact ? 'person--compact' : ''}">
      <a href="#profile" class="user-link person-link" data-user="${user.id}">
        ${avatarHtml(user, compact ? '' : 'avatar--lg')}
        <span class="person-name">
          <b>${escapeHtml(user.name)}</b>
          <span class="muted small">@${escapeHtml(user.username)}${d.city ? ` · ${escapeHtml(d.city)}` : ''}</span>
        </span>
      </a>
      ${common.items.length || onlyCats ? `
        <div class="person-common">
          <span class="common-count">${common.items.length
            ? `${common.items.length} ${common.items.length === 1 ? 'общ интерес' : 'общи интереса'}`
            : `${common.categories.length} ${common.categories.length === 1 ? 'обща категория' : 'общи категории'}`}</span>
          <ul class="chips">
            ${shown.map(x => `<li class="chip chip--static chip--hue" style="--c:${HOBBY_CATEGORIES[x.cat].hue}">${escapeHtml(x.item)}</li>`).join('')}
            ${onlyCats ? common.categories.slice(0, 3).map(c => `<li class="chip chip--static chip--hue" style="--c:${HOBBY_CATEGORIES[c].hue}">${HOBBY_CATEGORIES[c].name}</li>`).join('') : ''}
            ${more > 0 ? `<li class="chip chip--static">+${more}</li>` : ''}
          </ul>
        </div>` : ''}
      ${friendButtonHtml(me, user, true)}
    </li>`;
}

/* Един обработчик за всички бутони с data-friend в даден контейнер.
   „Премахни“ първо пита „Сигурен ли си?“. */
function bindFriendButtons(container, onChange) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-friend]');
    if (!btn) return;
    const me = Auth.currentUser();
    const other = Users.byId(btn.dataset.id);
    if (!other) return;

    switch (btn.dataset.friend) {
      case 'add':
        Friends.request(me.id, other.id);
        showToast(`Покана изпратена до ${other.name}.`);
        break;
      case 'cancel':
        Friends.remove(me.id, other.id);
        showToast('Поканата е отменена.');
        break;
      case 'accept':
        Friends.accept(me.id, other.id);
        showToast(`Вече сте приятели с ${other.name}.`);
        break;
      case 'decline':
        Friends.remove(me.id, other.id);
        showToast('Поканата е отказана.');
        break;
      case 'remove':
        if (!await confirmDialog({
          title: 'Премахване от приятели',
          text: `Сигурен ли си, че искаш да премахнеш ${other.name} от приятелите си? Ще трябва нова покана, за да станете приятели отново.`,
          ok: 'Премахни'
        })) return;
        Friends.remove(me.id, other.id);
        showToast(`${other.name} е премахнат от приятелите ти.`);
        break;
    }
    onChange();
    updateFriendBadge();
  });
}

/* Брояч на новите покани в горното меню */
function updateFriendBadge() {
  const me = Auth.currentUser();
  const badge = document.getElementById('friendBadge');
  const n = me ? Friends.incoming(me.id).length : 0;
  badge.textContent = n;
  badge.hidden = n === 0;
}

/* ---------- Страница „Приятели“ ---------- */
const FriendsPage = {
  tab: 'requests',

  init() {
    const root = document.getElementById('view-friends');
    root.querySelector('.page-tabs').addEventListener('click', e => {
      const t = e.target.closest('[data-tab]');
      if (!t) return;
      document.getElementById('peopleSearch').value = '';
      this.tab = t.dataset.tab;
      this.render();
    });
    document.getElementById('peopleSearch').addEventListener('input', () => this.render());
    bindFriendButtons(root, () => this.render());
  },

  render() {
    const me = Auth.currentUser();
    const incoming = Friends.incoming(me.id);
    const friends = Friends.friendsOf(me.id);
    const outgoing = Friends.outgoing(me.id);
    const query = document.getElementById('peopleSearch').value.trim().toLowerCase();

    // Ако няма покани, отваряме направо „Приятели“
    if (this.tab === 'requests' && !incoming.length && !this.visited) this.tab = friends.length ? 'friends' : 'suggestions';
    this.visited = true;
    if (query) this.tab = 'search';
    else if (this.tab === 'search') this.tab = 'friends';

    const tabs = [
      ['requests', 'Покани', incoming.length],
      ['friends', 'Приятели', friends.length],
      ['suggestions', 'Предложения', null],
      ['sent', 'Изпратени', outgoing.length]
    ];
    document.querySelector('#view-friends .page-tabs').innerHTML = tabs.map(([key, label, n]) => `
      <button type="button" class="page-tab ${this.tab === key ? 'is-active' : ''}" data-tab="${key}">
        ${label}${n ? `<span class="count">${n}</span>` : ''}
      </button>`).join('');

    const toItem = id => {
      const user = Users.byId(id);
      return user && !user.blocked ? { user, common: commonHobbies(me, user) } : null;
    };
    let items = [];
    let empty = '';

    if (this.tab === 'search') {
      items = Users.all()
        .filter(u => u.id !== me.id && !u.blocked &&
          (u.name.toLowerCase().includes(query) || u.username.includes(query)))
        .map(u => ({ user: u, common: commonHobbies(me, u) }));
      empty = `Няма потребител с „${escapeHtml(query)}“ в името.`;
    } else if (this.tab === 'requests') {
      items = incoming.map(toItem).filter(Boolean);
      empty = 'Нямаш нови покани за приятелство.';
    } else if (this.tab === 'friends') {
      items = friends.map(toItem).filter(Boolean).sort((a, b) => a.user.name.localeCompare(b.user.name, 'bg'));
      empty = 'Още нямаш приятели. Виж „Предложения“ – там са хората с твоите хобита.';
    } else if (this.tab === 'suggestions') {
      items = friendSuggestions(me, 30);
      empty = Object.keys(me.hobbies).length
        ? 'Няма нови хора с твоите хобита засега.'
        : 'Добави хобита в профила си, за да ти предложим хора със същите интереси.';
    } else if (this.tab === 'sent') {
      items = outgoing.map(toItem).filter(Boolean);
      empty = 'Нямаш изпратени покани, които чакат отговор.';
    }

    document.getElementById('friendsIntro').textContent = {
      search: `Резултати за „${query}“`,
      requests: 'Хора, които искат да сте приятели.',
      friends: 'Твоите приятели в Hobbified.',
      suggestions: 'Подредени по брой общи интереси – първо тези, с които имате най-много общо.',
      sent: 'Покани, на които още не са отговорили.'
    }[this.tab];

    document.getElementById('friendsList').innerHTML = items.length
      ? items.map(s => suggestionHtml(s)).join('')
      : `<li class="panel empty">${empty}</li>`;
  }
};
