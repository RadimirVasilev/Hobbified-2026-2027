/* =========================================================
   admin.js – админ панел (#admin)
   Вижда се само от потребители с role: 'admin'.
   Админът може да:
   - блокира и отблокира потребители (блокираният не може да влезе,
     а публикациите и коментарите му се скриват);
   - изтрива потребители, публикации и коментари.
   ========================================================= */

const AdminPage = {
  tab: 'comments',

  init() {
    const root = document.getElementById('view-admin');

    root.querySelector('.page-tabs').addEventListener('click', e => {
      const t = e.target.closest('[data-tab]');
      if (!t) return;
      this.tab = t.dataset.tab;
      this.render();
    });
    document.getElementById('adminSearch').addEventListener('input', () => this.render());

    root.addEventListener('click', async e => {
      const btn = e.target.closest('[data-admin]');
      if (!btn) return;
      const { admin: action, id, post } = btn.dataset;

      // Всяко изтриване и блокиране първо пита „Сигурен ли си?“
      const ask = this.question(action, id, post);
      if (ask && !await confirmDialog(ask)) return;

      if (action === 'block' || action === 'unblock') {
        const user = Users.update(id, { blocked: action === 'block' });
        showToast(action === 'block' ? `${user.name} е блокиран.` : `${user.name} е отблокиран.`);
      }
      if (action === 'delete-user') {
        const user = Users.byId(id);
        Users.remove(id);
        showToast(`Профилът на ${user.name} е изтрит.`);
      }
      if (action === 'delete-post') {
        Posts.remove(id);
        showToast('Публикацията е изтрита.');
      }
      if (action === 'delete-comment') {
        Posts.removeComment(post, id);
        showToast('Коментарът е изтрит.');
      }
      this.render();
    });
  },

  // Текстът на прозорчето за всяко действие
  question(action, id, postId) {
    if (action === 'delete-user') {
      const u = Users.byId(id);
      return { title: 'Изтриване на потребител',
        text: `Сигурен ли си, че искаш да изтриеш профила на ${u.name} (@${u.username})? Публикациите, коментарите и приятелствата му също ще бъдат изтрити.` };
    }
    if (action === 'delete-post') {
      const p = Posts.all().find(x => x.id === id);
      return { title: 'Изтриване на публикация',
        text: `Сигурен ли си, че искаш да изтриеш публикацията „${excerpt(p.text) || 'снимка'}“ на ${Users.byId(p.authorId)?.name}?` };
    }
    if (action === 'delete-comment') {
      const c = Posts.all().find(x => x.id === postId)?.comments.find(x => x.id === id);
      return { title: 'Изтриване на коментар',
        text: `Сигурен ли си, че искаш да изтриеш коментара „${excerpt(c?.text)}“ на ${Users.byId(c?.authorId)?.name}?` };
    }
    if (action === 'block') {
      const u = Users.byId(id);
      return { title: 'Блокиране на потребител', ok: 'Блокирай',
        text: `${u.name} няма да може да влиза, а публикациите и коментарите му ще се скрият. Можеш да го отблокираш по-късно.` };
    }
    return null;
  },

  render() {
    const users = Users.all();
    const posts = Posts.all();
    const comments = posts.flatMap(p => p.comments.map(c => ({ ...c, post: p })));
    const query = document.getElementById('adminSearch').value.trim().toLowerCase();

    // Обобщение отгоре
    const stats = [
      ['Потребители', users.filter(u => u.role !== 'admin').length, 'var(--accent)'],
      ['Публикации', posts.length, 'hsl(210 65% 50%)'],
      ['Коментари', comments.length, 'hsl(330 60% 52%)'],
      ['Блокирани', users.filter(u => u.blocked).length, 'var(--danger)'],
      ['Приятелства', Friends.all().filter(f => f.status === 'accepted').length, 'hsl(35 85% 50%)']
    ];
    document.getElementById('adminStats').innerHTML = stats.map(([label, n, color]) => `
      <div class="stat-tile" style="--tile:${color}"><b>${n}</b><span>${label}</span></div>`).join('');

    const tabs = [['comments', 'Коментари', comments.length], ['posts', 'Публикации', posts.length], ['users', 'Потребители', users.length]];
    document.querySelector('#view-admin .page-tabs').innerHTML = tabs.map(([key, label, n]) => `
      <button type="button" class="page-tab ${this.tab === key ? 'is-active' : ''}" data-tab="${key}">
        ${label}<span class="count">${n}</span>
      </button>`).join('');

    const match = (...texts) => !query || texts.some(t => String(t || '').toLowerCase().includes(query));
    const list = document.getElementById('adminList');

    if (this.tab === 'comments') {
      const rows = comments
        .map(c => ({ ...c, author: Users.byId(c.authorId) }))
        .filter(c => c.author && match(c.text, c.author.name, c.author.username))
        .sort((a, b) => b.createdAt - a.createdAt);
      list.innerHTML = rows.length ? rows.map(c => `
        <li class="mod-row">
          ${avatarHtml(c.author, 'avatar--sm')}
          <div class="mod-body">
            <div><a href="#profile" class="user-link" data-user="${c.author.id}">${escapeHtml(c.author.name)}</a>
              <span class="muted small">· ${timeAgo(c.createdAt)}${c.author.blocked ? ' · блокиран' : ''}</span></div>
            <p>${escapeHtml(c.text)}</p>
            <span class="muted small">към публикация: „${escapeHtml(c.post.text.slice(0, 70))}${c.post.text.length > 70 ? '…' : ''}“</span>
          </div>
          <button type="button" class="btn btn--danger-soft btn--sm" data-admin="delete-comment" data-id="${c.id}" data-post="${c.post.id}">Изтрий</button>
        </li>`).join('') : `<li class="empty">Няма коментари${query ? ' по това търсене' : ''}.</li>`;
    }

    if (this.tab === 'posts') {
      const rows = posts
        .map(p => ({ ...p, author: Users.byId(p.authorId) }))
        .filter(p => p.author && match(p.text, p.author.name, p.author.username))
        .sort((a, b) => b.createdAt - a.createdAt);
      list.innerHTML = rows.length ? rows.map(p => `
        <li class="mod-row">
          ${avatarHtml(p.author, 'avatar--sm')}
          <div class="mod-body">
            <div><a href="#profile" class="user-link" data-user="${p.author.id}">${escapeHtml(p.author.name)}</a>
              <span class="muted small">· ${timeAgo(p.createdAt)} · ${p.likes.length} харесвания · ${p.comments.length} коментара</span></div>
            <p>${escapeHtml(p.text)}</p>
          </div>
          <button type="button" class="btn btn--danger-soft btn--sm" data-admin="delete-post" data-id="${p.id}">Изтрий</button>
        </li>`).join('') : `<li class="empty">Няма публикации${query ? ' по това търсене' : ''}.</li>`;
    }

    if (this.tab === 'users') {
      const me = Auth.currentUser();
      const rows = users.filter(u => match(u.name, u.username, u.email))
        .sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || a.name.localeCompare(b.name, 'bg'));
      list.innerHTML = rows.length ? rows.map(u => {
        const isAdmin = u.role === 'admin';
        return `
        <li class="mod-row ${u.blocked ? 'is-blocked' : ''}">
          ${avatarHtml(u, 'avatar--sm')}
          <div class="mod-body">
            <div><a href="#profile" class="user-link" data-user="${u.id}">${escapeHtml(u.name)}</a>${roleBadge(u)}
              ${u.blocked ? '<span class="badge-blocked">блокиран</span>' : ''}</div>
            <span class="muted small">@${escapeHtml(u.username)} · ${escapeHtml(u.email)} ·
              ${posts.filter(p => p.authorId === u.id).length} публикации · ${Friends.friendsOf(u.id).length} приятели</span>
          </div>
          ${isAdmin || u.id === me.id ? '<span class="muted small">—</span>' : `
            <div class="row-gap">
              <button type="button" class="btn btn--ghost btn--sm" data-admin="${u.blocked ? 'unblock' : 'block'}" data-id="${u.id}">
                ${u.blocked ? 'Отблокирай' : 'Блокирай'}</button>
              <button type="button" class="btn btn--danger-soft btn--sm" data-admin="delete-user" data-id="${u.id}">Изтрий</button>
            </div>`}
        </li>`;
      }).join('') : `<li class="empty">Няма потребители по това търсене.</li>`;
    }
  }
};
