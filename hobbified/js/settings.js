/* =========================================================
   settings.js – страница „Настройки“
   Поверителност, тема, известия, имейл и парола,
   (личните данни се редактират от „Редактирай профила“)
   изтриване на профила.
   Поверителността, темата и известията се запазват веднага при промяна.
   ========================================================= */

const Settings = {
  init() {
    // Лявото меню превърта до съответния раздел
    document.querySelector('.settings-nav nav').addEventListener('click', e => {
      const btn = e.target.closest('[data-jump]');
      if (btn) document.getElementById(btn.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    this.bindPrivacy();
    this.bindTheme();
    this.bindNotifications();
    this.bindAccount();
    this.bindDelete();
  },

  // Попълва всички полета с текущите данни
  render() {
    const me = Auth.currentUser();
    document.getElementById('setBirthdayVis').value = me.settings.birthdayVisibility;
    document.getElementById('setShowAge').checked = me.settings.showAge;
    document.getElementById('setShowCity').checked = me.settings.showCity;
    document.getElementById('setProfileVis').value = me.settings.profileVisibility;

    document.querySelectorAll('[data-notify]').forEach(i => { i.checked = me.settings.notifications[i.dataset.notify]; });
    document.querySelectorAll('input[name="themeMode"]').forEach(r => { r.checked = r.value === Theme.mode(); });

    document.getElementById('setEmail').value = me.email;
    ['setEmailPass', 'setOldPass', 'setNewPass', 'setNewPass2', 'deletePass'].forEach(id => { document.getElementById(id).value = ''; });
    ['emailError', 'passwordError', 'deleteError'].forEach(id => { document.getElementById(id).hidden = true; });
    this.resetDeleteButton();
  },

  saveSettings(changes) {
    const me = Auth.currentUser();
    Users.update(me.id, { settings: { ...me.settings, ...changes } });
  },

  showError(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.hidden = !message;
  },

  bindPrivacy() {
    document.getElementById('set-privacy').addEventListener('change', () => {
      this.saveSettings({
        birthdayVisibility: document.getElementById('setBirthdayVis').value,
        showAge: document.getElementById('setShowAge').checked,
        showCity: document.getElementById('setShowCity').checked,
        profileVisibility: document.getElementById('setProfileVis').value
      });
      showToast('Поверителността е запазена.');
    });
    document.getElementById('set-privacy').addEventListener('submit', e => e.preventDefault());
  },

  bindTheme() {
    document.getElementById('set-appearance').addEventListener('change', e => {
      if (e.target.name === 'themeMode') Theme.set(e.target.value);
    });
  },

  bindNotifications() {
    const form = document.getElementById('set-notifications');
    form.addEventListener('change', e => {
      const box = e.target.closest('[data-notify]');
      if (!box) return;
      const me = Auth.currentUser();
      this.saveSettings({ notifications: { ...me.settings.notifications, [box.dataset.notify]: box.checked } });
      showToast('Известията са запазени.');
    });
    form.addEventListener('submit', e => e.preventDefault());
  },

  bindAccount() {
    document.getElementById('emailForm').addEventListener('submit', async e => {
      e.preventDefault();
      const me = Auth.currentUser();
      const email = document.getElementById('setEmail').value.trim().toLowerCase();
      const pass = document.getElementById('setEmailPass').value;

      if (!EMAIL_PATTERN.test(email))          return this.showError('emailError', 'Въведи валиден имейл адрес.');
      if (email === me.email)                  return this.showError('emailError', 'Това е текущият ти имейл.');
      if (Users.byEmail(email))                return this.showError('emailError', 'Вече има профил с този имейл.');
      if (await hashPassword(pass) !== me.passwordHash) return this.showError('emailError', 'Грешна парола.');

      Users.update(me.id, { email });
      this.showError('emailError', '');
      document.getElementById('setEmailPass').value = '';
      showToast('Имейлът е сменен.');
    });

    document.getElementById('passwordForm').addEventListener('submit', async e => {
      e.preventDefault();
      const me = Auth.currentUser();
      const oldPass = document.getElementById('setOldPass').value;
      const newPass = document.getElementById('setNewPass').value;
      const newPass2 = document.getElementById('setNewPass2').value;

      if (await hashPassword(oldPass) !== me.passwordHash) return this.showError('passwordError', 'Текущата парола е грешна.');
      if (newPass.length < 6)    return this.showError('passwordError', 'Новата парола трябва да е поне 6 символа.');
      if (newPass !== newPass2)  return this.showError('passwordError', 'Двете нови пароли не съвпадат.');
      if (newPass === oldPass)   return this.showError('passwordError', 'Новата парола трябва да е различна от старата.');

      Users.update(me.id, { passwordHash: await hashPassword(newPass) });
      this.showError('passwordError', '');
      e.target.reset();
      showToast('Паролата е сменена.');
    });
  },

  // Изтриването иска парола и потвърждение в прозорче
  bindDelete() {
    document.getElementById('set-danger').addEventListener('submit', async e => {
      e.preventDefault();
      const me = Auth.currentUser();
      if (await hashPassword(document.getElementById('deletePass').value) !== me.passwordHash) {
        return this.showError('deleteError', 'Грешна парола.');
      }
      this.showError('deleteError', '');

      const ok = await confirmDialog({
        title: 'Изтриване на профила',
        text: 'Сигурен ли си? Профилът, хобитата, публикациите, коментарите и приятелствата ти ще бъдат изтрити завинаги. Това не може да се върне.',
        ok: 'Изтрий завинаги'
      });
      if (!ok) return;
      Users.remove(me.id);
      Auth.logout();
      location.hash = '#login';
      showToast('Профилът е изтрит.');
    });
  },

  resetDeleteButton() {
    document.getElementById('deleteBtn').textContent = 'Изтрий профила';
  }
};
