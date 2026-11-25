/* =========================================================
   profile.js – профил: данни, редакция, хобита, публикации
   ========================================================= */

const Profile = {
  userId: null,        // чий профил гледаме в момента
  editing: false,
  selected: new Set(), // избраните неща в падащото меню (още незапазени)
  category: 'games',   // избраната категория във формата за хобита

  init() {
    document.getElementById('hobbyLevel').innerHTML = '<option value="">Без ниво</option>' +
      HOBBY_LEVELS.map(l => `<option>${l}</option>`).join('');

    this.initCategorySearch();
    this.initMultiSelect();

    // Запазване: избраните неща заменят досегашните за тази категория
    document.getElementById('addHobbyForm').addEventListener('submit', async e => {
      e.preventDefault();
      const cat = this.category;
      const me = Auth.currentUser();
      // Махане на цяла категория – питаме преди това
      if (!this.selected.size && me.hobbies[cat] && !await confirmDialog({
        title: 'Премахване на хоби',
        text: `Сигурен ли си, че искаш да премахнеш „${HOBBY_CATEGORIES[cat].name}“ от профила си заедно с всичко отбелязано в нея?`,
        ok: 'Премахни'
      })) return;
      const hobbies = { ...me.hobbies };
      const levels = { ...me.hobbyLevels };
      const level = document.getElementById('hobbyLevel').value;

      if (this.selected.size) {
        hobbies[cat] = [...this.selected];
        if (level) levels[cat] = level; else delete levels[cat];
      } else {
        delete hobbies[cat];
        delete levels[cat];
      }
      Users.update(me.id, { hobbies, hobbyLevels: levels });
      this.closeMulti();
      showToast(this.selected.size ? `Запазено: ${HOBBY_CATEGORIES[cat].name}` : `Премахнато: ${HOBBY_CATEGORIES[cat].name}`);
      this.render();
    });

    // Карти с хобита: премахване на едно нещо или редакция на цялата категория
    document.getElementById('hobbyGrid').addEventListener('click', e => {
      const remove = e.target.closest('[data-remove]');
      const edit = e.target.closest('[data-edit]');
      const me = Auth.currentUser();

      if (remove) {
        const [cat, index] = remove.dataset.remove.split(':');
        const hobbies = { ...me.hobbies };
        const levels = { ...me.hobbyLevels };
        hobbies[cat] = hobbies[cat].filter((_, i) => i !== Number(index));
        if (!hobbies[cat].length) { delete hobbies[cat]; delete levels[cat]; }
        Users.update(me.id, { hobbies, hobbyLevels: levels });
        this.render();
      }
      if (edit) {
        this.setCategory(edit.dataset.edit);
        document.getElementById('addHobbyForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.openMulti();
      }
    });

    // Горна част на профила: редакция на данните
    const head = document.getElementById('profileHead');
    // Профилна снимка: квадратна, 512×512, запазва се веднага
    head.addEventListener('change', async e => {
      if (e.target.id !== 'avatarInput') return;
      try {
        const avatar = await resizeImage(e.target.files[0], { maxSize: 512, square: true, quality: 0.9 });
        Users.update(Auth.currentUser().id, { avatar });
        showToast('Профилната снимка е сменена.');
        this.render();
      } catch (err) {
        showToast(err.message);
      }
    });
    head.addEventListener('click', async e => {
      if (e.target.closest('#removeAvatarBtn')) {
        if (!await confirmDialog({
          title: 'Махане на профилната снимка',
          text: 'Сигурен ли си, че искаш да махнеш профилната си снимка? На нейно място ще се показват инициалите ти.',
          ok: 'Махни'
        })) return;
        Users.update(Auth.currentUser().id, { avatar: null });
        showToast('Профилната снимка е махната.');
        this.render();
        return;
      }
      if (e.target.closest('#editProfileBtn')) { this.editing = true;  this.render(); }
      if (e.target.closest('#cancelEditBtn'))  { this.editing = false; this.render(); }
    });
    head.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('editName').value.trim();
      if (name.length < 2) { showToast('Името трябва да е поне 2 символа.'); return; }
      const { iso: birthDate, error } = this.birthday.result();
      if (error) { showToast(error); return; }

      Users.update(Auth.currentUser().id, {
        name,
        bio: document.getElementById('editBio').value.trim(),
        city: document.getElementById('editCity').value.trim(),
        birthDate,
        lookingFor: [...head.querySelectorAll('input[name="lookingFor"]:checked')].map(i => i.value)
      });
      this.editing = false;
      showToast('Профилът е обновен.');
      this.render();
    });

    bindPostList(document.getElementById('profilePosts'), () => this.render());
    bindFriendButtons(head, () => this.render());
    bindFriendButtons(document.getElementById('profileFriends'), () => this.render());
    head.addEventListener('click', e => {
      const btn = e.target.closest('[data-admin-block]');
      if (!btn || !Auth.isAdmin()) return;
      const user = Users.byId(btn.dataset.adminBlock);
      Users.update(user.id, { blocked: !user.blocked });
      showToast(user.blocked ? `${user.name} е отблокиран.` : `${user.name} е блокиран.`);
      this.render();
    });
  },

  /* ---------- Търсене на категория ----------
     Пишеш и излизат категориите, които съвпадат. Ако напишеш конкретно нещо
     (напр. „футбол“), излиза и в коя категория е – избираш го директно. */
  initCategorySearch() {
    this.categoryCombo = new Combo(document.getElementById('hobbyCategoryBox'), {
      id: 'hobbyCategory',
      placeholder: 'Пиши, напр. спорт или футбол…',
      filter: false,
      emptyText: 'Няма такава категория',
      getOptions: query => {
        const me = Auth.currentUser();
        const q = query.trim().toLowerCase();
        const cats = Object.entries(HOBBY_CATEGORIES).map(([key, c]) => ({
          value: key, label: c.name,
          hint: me?.hobbies[key] ? `${me.hobbies[key].length} избрани` : ''
        }));
        if (!q) return cats;

        const catMatches = cats.filter(c => c.label.toLowerCase().includes(q))
          .sort((a, b) => b.label.toLowerCase().startsWith(q) - a.label.toLowerCase().startsWith(q));
        const itemMatches = [];
        for (const [key, c] of Object.entries(HOBBY_CATEGORIES)) {
          for (const item of c.options) {
            if (item.toLowerCase().includes(q)) {
              itemMatches.push({ value: `${key}|${item}`, label: item, hint: c.name, display: c.name });
            }
          }
        }
        return [...catMatches, ...itemMatches.slice(0, 12)];
      },
      onSelect: option => {
        if (!option) return;
        const [cat, item] = String(option.value).split('|');
        this.setCategory(cat, item);
      }
    });
  },

  // Сменя категорията във формата; ако е дадено нещо, го отбелязва
  setCategory(cat, item) {
    this.category = cat;
    this.categoryCombo.setValue(cat);
    this.loadCategory();
    if (item) {
      this.selected.add(item);
      this.renderOptions();
      this.renderSelection();
      showToast(`„${item}“ е отбелязано в ${HOBBY_CATEGORIES[cat].name}. Натисни „Запази“.`);
    }
  },

  /* ---------- Падащо меню с отметки (избор на няколко неща) ---------- */
  initMultiSelect() {
    const toggle = document.getElementById('multiToggle');
    const search = document.getElementById('multiSearch');
    const list = document.getElementById('multiList');
    const custom = document.getElementById('customItem');

    toggle.addEventListener('click', () => {
      document.getElementById('multiPanel').hidden ? this.openMulti() : this.closeMulti();
    });
    search.addEventListener('input', () => this.renderOptions());

    list.addEventListener('change', e => {
      const box = e.target.closest('input[type="checkbox"]');
      if (!box) return;
      box.checked ? this.selected.add(box.value) : this.selected.delete(box.value);
      this.renderSelection();
    });

    const addCustom = () => {
      const value = custom.value.trim();
      if (!value) return;
      const exists = [...this.selected].some(x => x.toLowerCase() === value.toLowerCase());
      if (!exists) this.selected.add(value);
      custom.value = '';
      this.renderOptions();
      this.renderSelection();
    };
    document.getElementById('addCustomBtn').addEventListener('click', addCustom);
    custom.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });

    // Махане на избрано нещо от реда с чиповете под формата
    document.getElementById('selectedPreview').addEventListener('click', e => {
      const btn = e.target.closest('[data-unselect]');
      if (!btn) return;
      this.selected.delete(btn.dataset.unselect);
      this.renderOptions();
      this.renderSelection();
    });

    // Затваряне при клик извън менюто или с Escape
    document.addEventListener('click', e => {
      if (!e.target.closest('#multi, [data-edit], [data-unselect]')) this.closeMulti();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeMulti(); });
  },

  openMulti() {
    document.getElementById('multiPanel').hidden = false;
    document.getElementById('multiToggle').setAttribute('aria-expanded', 'true');
    document.getElementById('multiSearch').focus();
  },

  closeMulti() {
    document.getElementById('multiPanel').hidden = true;
    document.getElementById('multiToggle').setAttribute('aria-expanded', 'false');
  },

  // Зарежда вече запазените неща за избраната категория
  loadCategory() {
    const cat = this.category;
    this.categoryCombo.setValue(cat);
    const me = Auth.currentUser();
    this.selected = new Set(me.hobbies[cat] || []);
    document.getElementById('hobbyLevel').value = me.hobbyLevels[cat] || '';
    document.getElementById('multiLabel').textContent = HOBBY_CATEGORIES[cat].itemsLabel;
    document.getElementById('multiSearch').value = '';
    this.renderOptions();
    this.renderSelection();
  },

  renderOptions() {
    const cat = HOBBY_CATEGORIES[this.category];
    const query = document.getElementById('multiSearch').value.trim().toLowerCase();
    // готовите варианти + това, което потребителят е написал сам
    const all = [...new Set([...cat.options, ...this.selected])];
    const shown = all.filter(o => o.toLowerCase().includes(query));

    document.getElementById('multiList').innerHTML = shown.length
      ? shown.map((o, i) => `
          <li><label class="multi-option">
            <input type="checkbox" value="${escapeHtml(o)}" ${this.selected.has(o) ? 'checked' : ''}>
            <span>${escapeHtml(o)}</span>
          </label></li>`).join('')
      : `<li class="muted small multi-empty">Няма съвпадения. Добави го отдолу.</li>`;
  },

  renderSelection() {
    const n = this.selected.size;
    document.getElementById('multiSummary').textContent =
      n === 0 ? 'Избери от списъка' : n === 1 ? [...this.selected][0] : `Избрани: ${n}`;
    document.getElementById('selectedPreview').innerHTML = [...this.selected].map(item => `
      <li class="chip chip--static chip--picked">${escapeHtml(item)}
        <button type="button" class="chip-x" data-unselect="${escapeHtml(item)}" aria-label="Махни ${escapeHtml(item)}">×</button>
      </li>`).join('');

    const cat = this.category;
    const had = !!Auth.currentUser().hobbies[cat];
    document.getElementById('saveHobbyBtn').textContent = n === 0 && had ? 'Премахни категорията' : 'Запази';
  },

  show(userId) {
    this.userId = userId;
    this.editing = false;
  },

  /* ---------- Рисуване на страницата ---------- */
  render() {
    const me = Auth.currentUser();
    const user = Users.byId(this.userId) || me;
    const isMe = user.id === me.id;

    // „Само приятели“: другите виждат само името, аватара и бутона за покана
    const locked = !isMe && !Auth.isAdmin(me) && user.settings.profileVisibility === 'friends'
      && Friends.status(me.id, user.id) !== 'friends';
    this.renderHead(user, isMe, locked);
    document.getElementById('profileLocked').hidden = !locked;
    document.getElementById('profileBody').hidden = locked;
    if (locked) return;
    this.renderFriends(user, isMe);
    document.getElementById('addHobbyForm').hidden = !isMe;
    if (isMe) this.loadCategory();

    const hobbies = Object.entries(user.hobbies);
    document.getElementById('hobbySummary').textContent = hobbies.length
      ? `${hobbies.length} категории · ${hobbyCount(user)} интереса` : '';

    document.getElementById('hobbyGrid').innerHTML = hobbies.length
      ? hobbies.map(([cat, items]) => {
          const c = HOBBY_CATEGORIES[cat];
          const level = user.hobbyLevels[cat];
          // Общите неща с мен се оцветяват, когато гледам чужд профил
          const mine = me.hobbies[cat] || [];
          return `
          <div class="hobby-card" style="--c:${c.hue}">
            <div class="hobby-card-head">
              ${dotHtml(cat)}
              <h3>${c.name}</h3>
              ${level ? `<span class="level">${level}</span>` : ''}
              ${isMe ? `<button type="button" class="link-btn" data-edit="${cat}">Промени</button>` : ''}
            </div>
            <span class="label">${c.itemsLabel}</span>
            <ul class="chips">
              ${items.map((item, i) => `
                <li class="chip chip--static ${!isMe && mine.includes(item) ? 'chip--shared' : ''}"
                    ${!isMe && mine.includes(item) ? 'title="Имате го и двамата"' : ''}>${escapeHtml(item)}
                  ${isMe ? `<button type="button" class="chip-x" data-remove="${cat}:${i}" aria-label="Премахни ${escapeHtml(item)}">×</button>` : ''}
                </li>`).join('')}
            </ul>
          </div>`;
        }).join('')
      : `<p class="empty">${isMe
          ? 'Избери категория и отбележи всичко, което харесваш. Колкото по-конкретно, толкова по-точни ще са предложенията за приятели.'
          : 'Този потребител още няма добавени хобита.'}</p>`;

    const posts = Posts.newestFirst().filter(p => p.authorId === user.id);
    document.getElementById('profilePosts').innerHTML = posts.length
      ? posts.map(p => postHtml(p, me)).join('')
      : `<div class="panel empty">Все още няма публикации.</div>`;
  },

  // Блок „Приятели“ в профила
  renderFriends(user, isMe) {
    const ids = Friends.friendsOf(user.id);
    const friends = ids.map(id => Users.byId(id)).filter(u => u && !u.blocked);
    document.getElementById('profileFriends').innerHTML = `
      <div class="panel-head">
        <h3>Приятели <span class="muted">${friends.length}</span></h3>
        ${isMe ? '<a href="#friends" class="small">Управлявай</a>' : ''}
      </div>
      ${friends.length ? `<ul class="friend-faces">${friends.slice(0, 12).map(f => `
          <li><a href="#profile" class="user-link" data-user="${f.id}" title="${escapeHtml(f.name)}">
            ${avatarHtml(f)}<span>${escapeHtml(f.name.split(' ')[0])}</span></a></li>`).join('')}</ul>`
        : `<p class="muted small">${isMe ? 'Още нямаш приятели. Виж кого ти предлагаме в „Приятели“.' : 'Още няма приятели.'}</p>`}`;
  },

  renderHead(user, isMe, locked = false) {
    const since = new Date(user.createdAt).toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
    const head = document.getElementById('profileHead');

    if (isMe && this.editing) {
      head.innerHTML = `
        <div class="profile-cover"></div>
        <form class="profile-edit form">
          ${user.avatar ? `<div class="edit-avatar">
              ${avatarHtml(user, 'avatar--lg')}
              <button type="button" class="btn btn--danger-soft btn--sm" id="removeAvatarBtn">Махни профилната снимка</button>
            </div>` : ''}
          <div class="field-row">
            <div class="field">
              <label for="editName">Име</label>
              <input id="editName" value="${escapeHtml(user.name)}" maxlength="40">
            </div>
            <div class="field">
              <label for="editCity">Град</label>
              <input id="editCity" list="cityList" value="${escapeHtml(user.city)}" maxlength="40" placeholder="напр. Пловдив">
              <datalist id="cityList">${BG_CITIES.map(c => `<option value="${c}">`).join('')}</datalist>
            </div>
          </div>
          <fieldset class="field">
            <legend>Рожден ден</legend>
            <div id="editBirthdayBox"></div>
          </fieldset>
          <div class="field">
            <label for="editBio">За мен</label>
            <textarea id="editBio" rows="3" maxlength="200">${escapeHtml(user.bio)}</textarea>
          </div>
          <fieldset class="field checks">
            <legend>Какво търсиш в Hobbified</legend>
            ${Object.entries(LOOKING_FOR).map(([key, label]) => `
              <label class="check"><input type="checkbox" name="lookingFor" value="${key}" ${user.lookingFor.includes(key) ? 'checked' : ''}> ${label}</label>`).join('')}
          </fieldset>
          <div class="row-gap">
            <button class="btn btn--primary" type="submit">Запази</button>
            <button class="btn btn--ghost" type="button" id="cancelEditBtn">Откажи</button>
          </div>
        </form>`;
      this.birthday = new BirthdayPicker(document.getElementById('editBirthdayBox'), user.birthDate);
      return;
    }

    const me = Auth.currentUser();
    const d = locked ? { city: '', birthday: '', age: null } : visibleDetails(user, me);
    const common = isMe ? null : commonHobbies(me, user);
    const facts = locked ? [] : [
      d.city ? ['Град', escapeHtml(d.city)] : null,
      d.birthday ? ['Рожден ден', d.birthday] : null,
      d.age !== null ? ['Възраст', `${d.age} г.`] : null,
      ['В Hobbified от', since],
      ['Приятели', Friends.friendsOf(user.id).length],
      ['Публикации', Posts.all().filter(p => p.authorId === user.id).length]
    ].filter(Boolean);

    // Действия: моят профил – редакция; чужд – приятелство; админ – и блокиране
    let actions = isMe
      ? `<button class="btn btn--ghost" type="button" id="editProfileBtn">Редактирай профила</button>`
      : (user.role === 'admin' ? '' : friendButtonHtml(me, user));
    if (!isMe && Auth.isAdmin(me) && user.role !== 'admin') {
      actions += `<button type="button" class="btn btn--danger-soft btn--sm" data-admin-block="${user.id}">
        ${user.blocked ? 'Отблокирай' : 'Блокирай'}</button>`;
    }

    head.innerHTML = `
      <div class="profile-cover"></div>
      <div class="profile-info">
        ${isMe ? `<label class="avatar-upload" title="Смени профилната снимка">
            ${avatarHtml(user, 'avatar--xl')}
            <input type="file" id="avatarInput" accept="image/*" class="sr-only">
            <span class="avatar-upload-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>
          </label>` : avatarHtml(user, 'avatar--xl')}
        <div class="profile-text">
          <h1>${escapeHtml(user.name)}${roleBadge(user)}${user.blocked ? ' <span class="badge-blocked">блокиран</span>' : ''}</h1>
          ${isBirthdayToday(user) && d.birthday ? `<span class="bday">Днес има рожден ден</span>` : ''}
          <span class="muted">@${escapeHtml(user.username)}</span>
          <p>${user.bio ? escapeHtml(user.bio) : (isMe ? '<span class="muted">Добави няколко думи за себе си.</span>' : '')}</p>
        </div>
        <div class="profile-actions">${actions}</div>
      </div>
      ${locked ? '' : `<div class="profile-facts">
        <dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        ${common && common.score ? `<div class="common-banner">
            <b>${common.items.length ? `${common.items.length} общи интереса` : `${common.categories.length} общи категории`}</b>
            <span>${(common.items.length ? common.items.map(x => x.item) : common.categories.map(c => HOBBY_CATEGORIES[c].name)).slice(0, 4).map(escapeHtml).join(', ')}</span>
          </div>` : ''}
        ${user.lookingFor.length ? `
          <div class="looking">
            <span class="label">Търси</span>
            <ul class="chips">${user.lookingFor.map(k => `<li class="chip chip--static chip--accent">${LOOKING_FOR[k]}</li>`).join('')}</ul>
          </div>` : (isMe ? `<p class="muted small">Отбележи какво търсиш в Hobbified от „Редактирай профила“.</p>` : '')}
      </div>`}`;
  }
};
