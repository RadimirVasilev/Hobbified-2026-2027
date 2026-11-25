/* =========================================================
   combo.js – поле, в което може и да пишеш, и да избираш от списък
   Използва се за категориите хобита и за рождения ден.

   new Combo(елемент, {
     id, placeholder,
     getOptions: (текст) => [{ value, label, hint?, search? }],
     filter: true/false  – дали Combo само да филтрира по написаното
     onSelect: (опция или null) => {}
   })
   ========================================================= */

class Combo {
  constructor(root, opts) {
    this.opts = { filter: true, inputmode: 'text', ...opts };
    this.value = null;
    this.active = 0;     // коя опция е маркирана със стрелките
    this.shown = [];

    root.classList.add('combo');
    root.innerHTML = `
      <input class="combo-input" id="${opts.id}" placeholder="${opts.placeholder || ''}"
             inputmode="${this.opts.inputmode}" autocomplete="off"
             role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="${opts.id}-list">
      <ul class="combo-list" id="${opts.id}-list" role="listbox" hidden></ul>`;
    this.input = root.querySelector('input');
    this.list = root.querySelector('ul');

    this.input.addEventListener('focus', () => { this.input.select(); this.open(''); });
    this.input.addEventListener('input', () => {
      this.input.classList.remove('is-invalid');
      this.open(this.input.value);
    });
    this.input.addEventListener('keydown', e => this.onKey(e));
    this.input.addEventListener('blur', () => { this.commit(false); this.close(); });

    // mousedown вместо click, за да не изгуби полето фокуса преди избора
    this.list.addEventListener('mousedown', e => {
      const li = e.target.closest('[data-index]');
      if (!li) return;
      e.preventDefault();
      this.choose(this.shown[Number(li.dataset.index)]);
      this.close();
    });
  }

  normalize(text) {
    return String(text).trim().toLowerCase();
  }

  // Списък с опции, които отговарят на написаното. Тези, които започват
  // с написаното, излизат първи.
  matches(query) {
    const all = this.opts.getOptions(query);
    if (!this.opts.filter) return all;
    const q = this.normalize(query).replace(/^0+(?=\d)/, '');
    if (!q) return all;
    const starts = [], contains = [];
    for (const o of all) {
      const label = this.normalize(o.label);
      if (label.startsWith(q) || String(o.value) === q) starts.push(o);
      else if (label.includes(q) || (o.search || '').includes(q)) contains.push(o);
    }
    return [...starts, ...contains];
  }

  open(query) {
    this.shown = this.matches(query);
    const current = this.shown.findIndex(o => o.value === this.value);
    this.active = query ? 0 : Math.max(0, current);
    this.renderList();
    this.list.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.scrollToActive();
  }

  close() {
    this.list.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
  }

  renderList() {
    this.list.innerHTML = this.shown.length
      ? this.shown.map((o, i) => `
          <li role="option" data-index="${i}" class="${i === this.active ? 'is-active' : ''}"
              aria-selected="${o.value === this.value}">
            <span>${escapeHtml(o.label)}</span>${o.hint ? `<small>${escapeHtml(o.hint)}</small>` : ''}
          </li>`).join('')
      : `<li class="combo-empty">${this.opts.emptyText || 'Няма съвпадения'}</li>`;
  }

  scrollToActive() {
    const li = this.list.querySelector('.is-active');
    if (li) li.scrollIntoView({ block: 'nearest' });
  }

  onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.list.hidden) this.open(this.input.value);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      this.active = Math.min(this.shown.length - 1, Math.max(0, this.active + step));
      this.renderList();
      this.scrollToActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.commit(true);
      this.close();
    } else if (e.key === 'Escape') {
      this.setValue(this.value);
      this.close();
    }
  }

  /* Приема написаното. При Enter взима маркираната опция,
     при напускане на полето – само точно съвпадение или единствена опция. */
  commit(fromEnter) {
    const text = this.input.value.trim();
    if (!text) {
      if (this.value !== null) this.choose(null);
      return;
    }
    const q = this.normalize(text).replace(/^0+(?=\d)/, '');
    const found = this.matches(text);
    const exact = found.find(o => this.normalize(o.label) === q || String(o.value) === q);
    const pick = exact || (fromEnter && !this.list.hidden ? this.shown[this.active] : null) || (found.length === 1 ? found[0] : null);

    if (pick) this.choose(pick);
    else {
      this.input.classList.add('is-invalid');
      if (this.value !== null) { this.value = null; this.opts.onSelect?.(null); }
    }
  }

  choose(option) {
    this.value = option ? option.value : null;
    this.input.value = option ? (option.display ?? option.label) : '';
    this.input.classList.remove('is-invalid');
    this.opts.onSelect?.(option);
  }

  // Задава стойност отвън, без да вика onSelect
  setValue(value) {
    const option = this.opts.getOptions('').find(o => o.value === value);
    this.value = option ? value : null;
    this.input.value = option ? (option.display ?? option.label) : '';
    this.input.classList.remove('is-invalid');
  }
}

/* =========================================================
   Избор на рожден ден: три полета – ден, месец, година.
   Дните зависят от месеца и годината:
   30 или 31 дни, февруари – 28, а във високосна година – 29.
   ========================================================= */

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// Ако годината още не е избрана, допускаме 29 февруари
function daysInMonth(month, year) {
  if (!month) return 31;
  if (month === 2) return !year || isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

class BirthdayPicker {
  constructor(root, isoValue) {
    const thisYear = new Date().getFullYear();
    this.years = [];
    for (let y = thisYear - 10; y >= thisYear - 100; y--) this.years.push(y);

    root.classList.add('date-combo');
    root.innerHTML = `
      <div class="date-combo-fields">
        <div class="date-part date-part--day">
          <label class="sr-only" for="bdDay">Ден</label><div id="bdDayBox"></div>
        </div>
        <div class="date-part date-part--month">
          <label class="sr-only" for="bdMonth">Месец</label><div id="bdMonthBox"></div>
        </div>
        <div class="date-part date-part--year">
          <label class="sr-only" for="bdYear">Година</label><div id="bdYearBox"></div>
        </div>
      </div>
      <p class="date-hint" id="bdHint" aria-live="polite"></p>`;
    this.hint = root.querySelector('#bdHint');

    this.day = new Combo(root.querySelector('#bdDayBox'), {
      id: 'bdDay', placeholder: 'Ден', inputmode: 'numeric',
      getOptions: () => {
        const max = daysInMonth(this.month.value, this.year.value);
        return Array.from({ length: max }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
      },
      emptyText: 'Няма такъв ден',
      onSelect: () => this.check()
    });

    this.month = new Combo(root.querySelector('#bdMonthBox'), {
      id: 'bdMonth', placeholder: 'Месец',
      getOptions: () => MONTHS.map((name, i) => ({ value: i + 1, label: name, hint: String(i + 1) })),
      onSelect: () => this.check()
    });

    this.year = new Combo(root.querySelector('#bdYearBox'), {
      id: 'bdYear', placeholder: 'Година', inputmode: 'numeric',
      // "06" намира 2006
      getOptions: () => this.years.map(y => ({ value: y, label: String(y), search: String(y).slice(2) })),
      emptyText: `Между ${thisYear - 100} и ${thisYear - 10}`,
      onSelect: () => this.check()
    });

    if (isoValue) {
      const [y, m, d] = isoValue.split('-').map(Number);
      this.year.setValue(y);
      this.month.setValue(m);
      this.day.setValue(d);
    }
    this.check();
  }

  // Проверява дали денят съществува в избрания месец и година
  check() {
    const d = this.day.value, m = this.month.value, y = this.year.value;
    const max = daysInMonth(m, y);
    this.hint.classList.remove('is-error');
    if (d && d <= max) this.day.input.classList.remove('is-invalid');

    if (d && m && d > max) {
      this.day.input.classList.add('is-invalid');
      this.hint.classList.add('is-error');
      this.hint.textContent = m === 2 && d === 29
        ? `${y} не е високосна година – февруари има 28 дни.`
        : `${MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1)} има само ${max} дни.`;
      return;
    }
    if ([this.day, this.month, this.year].some(c => c.input.classList.contains('is-invalid'))) {
      this.hint.classList.add('is-error');
      this.hint.textContent = 'Избери от списъка или напиши валидна стойност.';
      return;
    }
    this.hint.textContent = m === 2 && y ? `${y} ${isLeapYear(y) ? 'е' : 'не е'} високосна – февруари има ${max} дни.` : '';
  }

  // Връща { iso, error }
  result() {
    const d = this.day.value, m = this.month.value, y = this.year.value;
    const filled = [d, m, y].filter(Boolean).length;
    const typed = [this.day, this.month, this.year].some(c => c.input.value.trim());
    if (filled === 0 && !typed) return { iso: null, error: '' };
    if (filled < 3) return { iso: null, error: 'Попълни ден, месец и година на рождения ден.' };
    if (d > daysInMonth(m, y)) return { iso: null, error: 'Тази дата не съществува. Провери деня.' };
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { iso, error: birthDateError(iso) };
  }
}
