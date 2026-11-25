/* =========================================================
   ui.js – общи помощни функции за интерфейса
   ========================================================= */

// Защита от XSS: всеки текст от потребителя минава оттук преди да влезе в HTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// Всеки потребител получава постоянен цвят на аватара според името си
function avatarHue(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// Профилна снимка, а ако няма – инициали върху цветен кръг
function avatarHtml(user, size = '') {
  if (user.avatar) {
    return `<span class="avatar avatar--photo ${size}"><img src="${user.avatar}" alt="${escapeHtml(user.name)}"></span>`;
  }
  return `<span class="avatar ${size}" style="--hue:${avatarHue(user.username)}">${escapeHtml(initials(user.name))}</span>`;
}

function timeAgo(timestamp) {
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 60)     return 'току-що';
  const min = Math.floor(sec / 60);
  if (min < 60)     return `преди ${min} мин`;
  const hours = Math.floor(min / 60);
  if (hours < 24)   return `преди ${hours} ч`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return days === 1 ? 'вчера' : `преди ${days} дни`;
  return new Date(timestamp).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Цветна точка за категория хоби
function dotHtml(categoryKey) {
  return `<span class="dot" style="--c:${HOBBY_CATEGORIES[categoryKey].hue}"></span>`;
}

const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли',
  'август', 'септември', 'октомври', 'ноември', 'декември'];

// Рожденият ден се пази като текст 'ГГГГ-ММ-ДД'
function parseBirthDate(user) {
  if (!user.birthDate) return null;
  const [y, m, d] = user.birthDate.split('-').map(Number);
  return { y, m, d };
}

// Точна възраст: ако рожденият ден тази година още не е минал, вадим 1
function ageOf(user) {
  const b = parseBirthDate(user);
  if (!b) return null;
  const now = new Date();
  let age = now.getFullYear() - b.y;
  if (now.getMonth() + 1 < b.m || (now.getMonth() + 1 === b.m && now.getDate() < b.d)) age--;
  return age;
}

// Позволени дати за рожден ден: между 100 и 10 години назад
function birthDateLimits() {
  const now = new Date();
  const iso = y => `${y}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { min: iso(now.getFullYear() - 100), max: iso(now.getFullYear() - 10) };
}

function birthDateError(value) {
  if (!value) return '';
  const { min, max } = birthDateLimits();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Въведи валидна дата на раждане.';
  if (value > max) return 'Трябва да си поне на 10 години, за да имаш профил.';
  if (value < min) return 'Провери годината на раждане.';
  return '';
}

function birthdayText(user, withYear) {
  const b = parseBirthDate(user);
  if (!b) return '';
  return `${b.d} ${MONTHS[b.m - 1]}${withYear ? ` ${b.y} г.` : ''}`;
}

function isBirthdayToday(user) {
  const b = parseBirthDate(user);
  const now = new Date();
  return !!b && b.m === now.getMonth() + 1 && b.d === now.getDate();
}

/* Какво от личните данни се вижда. На собствения профил виждам всичко,
   на чуждия – само това, което собственикът е разрешил в настройките. */
function visibleDetails(user, viewer) {
  const isMe = viewer && viewer.id === user.id;
  const s = user.settings;
  const birthday = isMe || s.birthdayVisibility !== 'hidden'
    ? birthdayText(user, isMe || s.birthdayVisibility === 'full') : '';
  return {
    city: isMe || s.showCity ? user.city : '',
    age: isMe || s.showAge ? ageOf(user) : null,
    birthday
  };
}

function roleBadge(user) {
  return user.role === 'admin' ? ' <span class="badge-admin" title="Администратор">админ</span>' : '';
}

function hobbyCount(user) {
  return Object.values(user.hobbies || {}).reduce((sum, items) => sum + items.length, 0);
}

/* ---------- Прозорче „Сигурен ли си?“ ----------
   Връща Promise: true при „Изтрий“, false при „Откажи“, Escape или клик извън прозорчето.
   Пример:  if (await confirmDialog({ title: 'Изтриване', text: '...' })) { ... } */
function confirmDialog({ title, text, ok = 'Изтрий', cancel = 'Откажи' }) {
  const modal = document.getElementById('confirmModal');
  const okBtn = document.getElementById('confirmOk');
  const cancelBtn = document.getElementById('confirmCancel');
  const before = document.activeElement;

  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  okBtn.textContent = ok;
  cancelBtn.textContent = cancel;
  modal.hidden = false;
  cancelBtn.focus();              // по-безопасно: Enter по подразбиране отказва

  return new Promise(resolve => {
    const close = answer => {
      modal.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
      if (before && before.isConnected) before.focus();
      resolve(answer);
    };
    const onOk = () => close(true);
    const onCancel = () => close(false);
    const onBackdrop = e => { if (e.target === modal) close(false); };
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
      // Tab остава в прозорчето
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === okBtn ? cancelBtn : okBtn).focus();
      }
    };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey, true);
  });
}

// Кратък откъс от текст за прозорчето
function excerpt(text, max = 60) {
  text = String(text || '').trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/* Снимка на цял екран */
function openLightbox(src) {
  const box = document.getElementById('lightbox');
  box.querySelector('img').src = src;
  box.classList.remove('is-zoomed');
  document.getElementById('lightboxHint').textContent = 'Кликни снимката за истински размер';
  box.hidden = false;
  box.querySelector('button').focus();
}
function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
}

// Клик върху снимката: превключва между „цялата в екрана“ и истински размер
function toggleLightboxZoom(e) {
  const box = document.getElementById('lightbox');
  const img = box.querySelector('img');
  const zoomed = box.classList.toggle('is-zoomed');
  document.getElementById('lightboxHint').textContent = zoomed
    ? 'Скролвай, за да разгледаш. Клик – обратно.'
    : 'Кликни снимката за истински размер';
  if (zoomed) {
    // приближаваме там, където е кликнато
    const r = e.target.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    requestAnimationFrame(() => {
      box.scrollLeft = fx * img.offsetWidth - box.clientWidth / 2;
      box.scrollTop = fy * img.offsetHeight - box.clientHeight / 2;
    });
  }
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

/* ---------- Карта на публикация (ползва се във feed и в профила) ---------- */
function postHtml(post, me) {
  const author = Users.byId(post.authorId);
  if (!author) return '';
  const liked = post.likes.includes(me.id);
  const category = HOBBY_CATEGORIES[post.hobby];
  const admin = Auth.isAdmin(me);
  const canDeletePost = post.authorId === me.id || admin;

  const comments = post.comments.map(c => {
    const cu = Users.byId(c.authorId);
    if (!cu || cu.blocked) return '';
    // Коментар може да изтрие авторът му, авторът на публикацията или админ
    const canDelete = c.authorId === me.id || post.authorId === me.id || admin;
    return `
      <li class="comment" data-comment="${c.id}">
        ${avatarHtml(cu, 'avatar--sm')}
        <div class="comment-body">
          <a href="#profile" class="user-link" data-user="${cu.id}">${escapeHtml(cu.name)}</a>${roleBadge(cu)}
          <span class="muted">· ${timeAgo(c.createdAt)}</span>
          <p>${escapeHtml(c.text)}</p>
        </div>
        ${canDelete ? `<button type="button" class="comment-del" data-action="delete-comment"
            title="${c.authorId === me.id ? 'Изтрий коментара си' : 'Изтрий коментара'}" aria-label="Изтрий коментара">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg></button>` : ''}
      </li>`;
  }).join('');

  return `
    <article class="panel post ${category ? 'post--tagged' : ''}" data-post="${post.id}" ${category ? `style="--c:${category.hue}"` : ''}>
      <header class="post-head">
        ${avatarHtml(author)}
        <div class="post-meta">
          <a href="#profile" class="user-link" data-user="${author.id}">${escapeHtml(author.name)}</a>${roleBadge(author)}
          <span class="muted">@${escapeHtml(author.username)} · ${timeAgo(post.createdAt)}</span>
        </div>
        ${category ? `<span class="tag" style="--c:${category.hue}">${category.name}</span>` : ''}
      </header>
      ${post.text ? `<p class="post-text">${escapeHtml(post.text)}</p>` : ''}
      ${post.image ? `<button type="button" class="post-image" data-action="zoom" aria-label="Отвори снимката"><img src="${post.image}" alt="Снимка към публикацията" loading="lazy"></button>` : ''}
      <div class="post-actions">
        <button type="button" class="action ${liked ? 'is-active' : ''}" data-action="like" aria-pressed="${liked}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z"/></svg>
          ${post.likes.length}
        </button>
        <span class="action action--static">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg>
          ${post.comments.length}
        </span>
        ${canDeletePost ? `<button type="button" class="action action--danger" data-action="delete">${post.authorId === me.id ? 'Изтрий' : 'Изтрий (админ)'}</button>` : ''}
      </div>
      ${comments ? `<ul class="comments">${comments}</ul>` : ''}
      <form class="comment-form" data-action="comment">
        <label class="sr-only" for="c-${post.id}">Коментар</label>
        <input id="c-${post.id}" maxlength="300" placeholder="Напиши коментар…" autocomplete="off">
        <button class="btn btn--ghost btn--sm" type="submit">Изпрати</button>
      </form>
    </article>`;
}

/* Обработва харесване, коментар и изтриване в даден списък с публикации.
   onChange се извиква след всяка промяна, за да се прерисува списъкът. */
function bindPostList(container, onChange) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    const postEl = e.target.closest('[data-post]');
    if (!btn || !postEl || btn.tagName === 'FORM') return;
    const me = Auth.currentUser();
    const postId = postEl.dataset.post;

    if (btn.dataset.action === 'zoom') {
      openLightbox(btn.querySelector('img').src);
      return;
    }

    if (btn.dataset.action === 'like') {
      Posts.toggleLike(postId, me.id);
      onChange();
    }

    if (btn.dataset.action === 'delete') {
      const post = Posts.all().find(p => p.id === postId);
      const mine = post.authorId === me.id;
      const ok = await confirmDialog({
        title: 'Изтриване на публикацията',
        text: `${mine ? 'Сигурен ли си, че искаш да изтриеш публикацията си' : 'Сигурен ли си, че искаш да изтриеш тази публикация'}${post.text ? ` „${excerpt(post.text)}“` : ''}? Коментарите и харесванията към нея също ще изчезнат.`
      });
      if (!ok) return;
      Posts.remove(postId);
      showToast('Публикацията е изтрита.');
      onChange();
    }

    if (btn.dataset.action === 'delete-comment') {
      const commentEl = btn.closest('[data-comment]');
      const post = Posts.all().find(p => p.id === postId);
      const comment = post.comments.find(c => c.id === commentEl.dataset.comment);
      commentEl.classList.add('is-confirming');
      const ok = await confirmDialog({
        title: 'Изтриване на коментара',
        text: `Сигурен ли си, че искаш да изтриеш ${comment.authorId === me.id ? 'коментара си' : 'този коментар'} „${excerpt(comment.text)}“?`
      });
      commentEl.classList.remove('is-confirming');
      if (!ok) return;
      Posts.removeComment(postId, comment.id);
      showToast('Коментарът е изтрит.');
      onChange();
    }
  });

  container.addEventListener('submit', e => {
    const form = e.target.closest('form[data-action="comment"]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    Posts.addComment(form.closest('[data-post]').dataset.post, Auth.currentUser().id, text);
    onChange();
  });
}
