/* =========================================================
   feed.js – начална страница: нова публикация, филтри, списък,
   лява колона (моят профил) и дясна колона (популярни хобита)
   ========================================================= */

const Feed = {
  filter: 'all',

  init() {
    const text = document.getElementById('postText');
    const counter = document.getElementById('charCount');
    text.addEventListener('input', () => { counter.textContent = `${text.value.length} / 500`; });

    // Снимка към публикацията: смаляваме я веднага и показваме преглед
    const fileInput = document.getElementById('postImage');
    const preview = document.getElementById('composerPreview');
    const clearImage = () => {
      this.pendingImage = null;
      fileInput.value = '';
      preview.hidden = true;
    };
    fileInput.addEventListener('change', async () => {
      try {
        this.pendingImage = await resizeImage(fileInput.files[0], { maxSize: 1600, quality: 0.86 });
        document.getElementById('composerImg').src = this.pendingImage;
        preview.hidden = false;
      } catch (err) {
        clearImage();
        showToast(err.message);
      }
    });
    document.getElementById('composerRemove').addEventListener('click', clearImage);

    document.getElementById('composer').addEventListener('submit', e => {
      e.preventDefault();
      const value = text.value.trim();
      if (!value && !this.pendingImage) { showToast('Напиши нещо или добави снимка.'); return; }
      try {
        Posts.create(Auth.currentUser().id, value, document.getElementById('postHobby').value, this.pendingImage);
      } catch (err) {
        showToast(err.message);
        return;
      }
      text.value = '';
      counter.textContent = '0 / 500';
      clearImage();
      showToast('Публикувано.');
      this.render();
    });

    document.getElementById('feedFilters').addEventListener('click', e => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      this.filter = chip.dataset.filter;
      this.render();
    });

    bindPostList(document.getElementById('feedPosts'), () => this.render());
    bindFriendButtons(document.getElementById('feedSuggestions'), () => this.render());
  },

  render() {
    const me = Auth.currentUser();
    this.renderComposerSelect(me);
    this.renderMe(me);
    this.renderPopular();
    this.renderSuggestions(me);
    this.renderGames(me);

    // Филтрите показват само хобита, по които има публикации
    const used = new Set(Posts.all().map(p => p.hobby).filter(k => HOBBY_CATEGORIES[k]));
    const chips = [['all', 'Всички'], ['friends', 'Приятели'], ['mine', 'Моите хобита'], ...[...used].map(k => [k, HOBBY_CATEGORIES[k].name])];
    if (!chips.some(c => c[0] === this.filter)) this.filter = 'all';
    document.getElementById('feedFilters').innerHTML = chips.map(([key, label]) =>
      `<button type="button" class="chip ${this.filter === key ? 'is-active' : ''}" data-filter="${key}"
         ${HOBBY_CATEGORIES[key] ? `style="--c:${HOBBY_CATEGORIES[key].hue}"` : ''}>${label}</button>`).join('');

    let posts = Posts.newestFirst();
    if (this.filter === 'friends') {
      const friends = new Set([...Friends.friendsOf(me.id), me.id]);
      posts = posts.filter(p => friends.has(p.authorId));
    } else if (this.filter === 'mine') {
      const myCats = Object.keys(me.hobbies);
      posts = posts.filter(p => myCats.includes(p.hobby));
    } else if (this.filter !== 'all') {
      posts = posts.filter(p => p.hobby === this.filter);
    }

    document.getElementById('feedPosts').innerHTML = posts.length
      ? posts.map(p => postHtml(p, me)).join('')
      : `<div class="panel empty">Няма публикации тук. Бъди първият, който ще напише нещо.</div>`;
  },

  // Първо са моите хобита, после всички останали
  renderComposerSelect(me) {
    const select = document.getElementById('postHobby');
    const current = select.value;
    const mine = Object.keys(me.hobbies);
    const others = Object.keys(HOBBY_CATEGORIES).filter(k => !mine.includes(k));
    const opt = k => `<option value="${k}">${HOBBY_CATEGORIES[k].name}</option>`;
    select.innerHTML = '<option value="">Без хоби</option>' +
      (mine.length ? `<optgroup label="Моите хобита">${mine.map(opt).join('')}</optgroup>` : '') +
      `<optgroup label="Други">${others.map(opt).join('')}</optgroup>`;
    select.value = current;
  },

  renderMe(me) {
    const hobbies = Object.entries(me.hobbies);
    const d = visibleDetails(me, me);
    const details = [d.city, d.age ? `${d.age} г.` : ''].filter(Boolean).join(' · ');

    document.getElementById('feedMe').innerHTML = `
      <a href="#profile" class="me-card user-link" data-user="${me.id}">
        ${avatarHtml(me, 'avatar--lg')}
        <div>
          <strong>${escapeHtml(me.name)}${isBirthdayToday(me) ? ' <span class="bday" title="Честит рожден ден!">рожден ден</span>' : ''}</strong>
          <span class="muted">@${escapeHtml(me.username)}</span>
          ${details ? `<span class="muted small">${escapeHtml(details)}</span>` : ''}
        </div>
      </a>
      ${me.bio ? `<p class="me-bio">${escapeHtml(me.bio)}</p>` : ''}
      <div class="me-stats">
        <a href="#friends" class="stat-link"><b>${Friends.friendsOf(me.id).length}</b><span>приятели</span></a>
        <div><b>${hobbyCount(me)}</b><span>интереса</span></div>
        <div><b>${Posts.all().filter(p => p.authorId === me.id).length}</b><span>публикации</span></div>
      </div>
      ${hobbies.length
        ? `<ul class="me-hobbies">${hobbies.map(([k, items]) => `
            <li>
              <div class="me-hobby-head">${dotHtml(k)}<b>${HOBBY_CATEGORIES[k].name}</b>
                ${me.hobbyLevels[k] ? `<span class="level">${me.hobbyLevels[k]}</span>` : ''}</div>
              <span class="muted small">${items.slice(0, 3).map(escapeHtml).join(', ')}${items.length > 3 ? ` и още ${items.length - 3}` : ''}</span>
            </li>`).join('')}</ul>`
        : `<p class="muted small">Още нямаш добавени хобита.</p>`}
      <a href="#profile" class="btn btn--ghost btn--full btn--sm user-link" data-user="${me.id}">Редактирай хобитата</a>`;
  },

  // Хора с общи хобита, с бутон за покана
  renderSuggestions(me) {
    const list = friendSuggestions(me, 4);
    const incoming = Friends.incoming(me.id).length;
    document.getElementById('feedSuggestions').innerHTML = `
      <div class="panel-head">
        <h3>Хора с твоите хобита</h3>
        <a href="#friends" class="small">Всички</a>
      </div>
      ${incoming ? `<a href="#friends" class="request-alert">Имаш ${incoming} ${incoming === 1 ? 'нова покана' : 'нови покани'} за приятелство</a>` : ''}
      ${list.length ? `<ul class="suggest-list">${list.map(s => suggestionHtml(s, true)).join('')}</ul>`
        : `<p class="muted small">${Object.keys(me.hobbies).length
            ? 'Няма нови хора с твоите хобита засега.'
            : 'Добави хобита в профила си, за да ти предложим хора.'}</p>`}`;
  },

  // Мини игрите с моя рекорд
  renderGames(me) {
    document.getElementById('feedGames').innerHTML = `
      <div class="panel-head"><h3>Мини игри</h3><a href="#games" class="small">Всички</a></div>
      <ul class="mini-games">${Object.values(GAMES).map(g => {
        const best = Scores.best(me.id, g.key);
        return `<li>
          <button type="button" class="mini-game mini-game--${g.key}" data-open-game="${g.key}">
            <span class="mini-game-name">${g.name}</span>
            <span class="muted small">${best ? `рекорд ${best}` : 'още не си играл'}</span>
          </button></li>`;
      }).join('')}</ul>`;
  },

  // Колко потребители имат всяка категория (топ 6)
  renderPopular() {
    const users = Users.all();
    const counts = Object.keys(HOBBY_CATEGORIES)
      .map(k => [k, users.filter(u => u.hobbies[k]?.length).length])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const max = Math.max(1, ...counts.map(c => c[1]));

    document.getElementById('popularHobbies').innerHTML = `
      <h3>Популярни хобита</h3>
      <p class="muted small">Брой хора в Hobbified с това хоби</p>
      <ul class="bars">
        ${counts.map(([k, n]) => `
          <li>
            <div class="bar-label">${dotHtml(k)}<span>${HOBBY_CATEGORIES[k].name}</span><b>${n}</b></div>
            <div class="bar"><span style="width:${(n / max) * 100}%; --c:${HOBBY_CATEGORIES[k].hue}"></span></div>
          </li>`).join('')}
      </ul>`;
  }
};
