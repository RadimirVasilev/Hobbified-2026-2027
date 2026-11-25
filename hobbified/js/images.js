/* =========================================================
   images.js – снимки
   Преди да запазим снимка, я смаляваме и компресираме (WebP или JPEG),
   за да заема малко място. Засега снимките се пазят в браузъра
   като текст (data URL). Със Supabase ще отидат в Supabase Storage.
   ========================================================= */

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_UPLOAD_MB = 25;

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Не е избрана снимка.'));
    if (!IMAGE_TYPES.includes(file.type)) return reject(new Error('Избери снимка във формат JPG, PNG, WEBP или GIF.'));
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return reject(new Error(`Снимката е над ${MAX_UPLOAD_MB} MB. Избери по-малка.`));

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Снимката не може да се отвори.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Снимката не може да се прочете.'));
    reader.readAsDataURL(file);
  });
}

/* Проверка дали браузърът може да запазва във WebP – той дава
   по-добро качество от JPEG при същия размер на файла. */
let webpSupported = null;
function canUseWebp() {
  if (webpSupported === null) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    webpSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupported;
}

/* Смалява снимката така, че по-дългата страна да е най-много maxSize.
   square: true изрязва квадрат от средата (за профилна снимка).

   Важно за качеството: при голямо смаляване наведнъж (напр. 4000 → 1600 px)
   браузърът пропуска пиксели и снимката излиза „на квадратчета“.
   Затова смаляваме на стъпки – всеки път най-много наполовина. */
async function resizeImage(file, { maxSize = 1600, quality = 0.88, square = false } = {}) {
  const img = await readImageFile(file);
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }

  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const targetW = Math.round(sw * scale);
  const targetH = Math.round(sh * scale);

  // 1. Изрязваме нужната част (с бял фон за прозрачните PNG). Много големите
  //    снимки (напр. 48 MP от нов телефон) първо свиваме до 4096 px, защото
  //    телефоните не могат да рисуват толкова голямо платно.
  const s0 = Math.min(1, 4096 / Math.max(sw, sh));
  let canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * s0);
  canvas.height = Math.round(sh * s0);
  let ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  // 2. Смаляваме на стъпки по половина, докато се доближим до целта
  while (canvas.width / 2 >= targetW && canvas.height / 2 >= targetH) {
    canvas = halfSize(canvas);
  }

  // 3. Последна стъпка до точния размер, с най-високо качество на изглаждане
  if (canvas.width !== targetW || canvas.height !== targetH) {
    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, targetW, targetH);
    canvas = out;
  }

  return canUseWebp()
    ? canvas.toDataURL('image/webp', quality)
    : canvas.toDataURL('image/jpeg', quality);
}

function halfSize(source) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(source.width / 2));
  c.height = Math.max(1, Math.round(source.height / 2));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}
