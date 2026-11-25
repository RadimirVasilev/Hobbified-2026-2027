/* =========================================================
   auth.js – регистрация, вход, изход и текуща сесия
   ========================================================= */

const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Auth = {
  currentUser() {
    const id = Store.get('session', null);
    const user = id ? Users.byId(id) : null;
    if (user && user.blocked) { this.logout(); return null; }
    return user;
  },

  isAdmin(user = this.currentUser()) {
    return !!user && user.role === 'admin';
  },

  async register({ name, username, email, password, password2 }) {
    name = name.trim();
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    if (name.length < 2)                    throw new Error('Въведи име поне от 2 символа.');
    if (!USERNAME_PATTERN.test(username))   throw new Error('Потребителското име трябва да е 3–20 символа: малки латински букви, цифри, точка или долна черта.');
    if (!EMAIL_PATTERN.test(email))         throw new Error('Въведи валиден имейл адрес.');
    if (password.length < 6)                throw new Error('Паролата трябва да е поне 6 символа.');
    if (password !== password2)             throw new Error('Двете пароли не съвпадат.');
    if (Users.byUsername(username))         throw new Error('Това потребителско име е заето. Избери друго.');
    if (Users.byEmail(email))               throw new Error('Вече има профил с този имейл.');

    const user = Users.create({
      id: generateId(),
      name, username, email,
      passwordHash: await hashPassword(password),
      bio: '',
      hobbies: {},
      createdAt: Date.now()
    });
    Store.set('session', user.id);
    return user;
  },

  async login(username, password) {
    const user = Users.byUsername(username.trim());
    if (!user || user.passwordHash !== await hashPassword(password)) {
      throw new Error('Грешно потребителско име или парола.');
    }
    if (user.blocked) throw new Error('Профилът ти е блокиран от администратор.');
    Store.set('session', user.id);
    return user;
  },

  logout() {
    Store.remove('session');
  }
};
