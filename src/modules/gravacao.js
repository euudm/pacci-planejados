// Logo da Pacci "gravado a laser": a gravação varre em círculo e solta faíscas na frente.
export function montarGravacao(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H * 0.52;
  const img = new Image();
  img.src = '/marca/logo-selo.png';

  let baldes = null; // pixels opacos agrupados por ângulo
  const N = 240;
  const faiscas = [];
  let inicio = 0, rodando = false, pronto = false;
  const DUR = 3400;

  img.onload = () => {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.drawImage(img, 0, 0, W, H);
    const dados = o.getImageData(0, 0, W, H).data;
    baldes = Array.from({ length: N }, () => []);
    for (let y = 0; y < H; y += 3) {
      for (let x = 0; x < W; x += 3) {
        if (dados[(y * W + x) * 4 + 3] > 120) {
          let a = Math.atan2(y - cy, x - cx) + Math.PI / 2;
          if (a < 0) a += Math.PI * 2;
          baldes[Math.floor((a / (Math.PI * 2)) * N) % N].push(x, y);
        }
      }
    }
    pronto = true;
    if (rodando) { inicio = performance.now(); requestAnimationFrame(quadro); }
  };

  function quadro(agora) {
    if (!pronto) return;
    const t = Math.min(1, (agora - inicio) / DUR);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const ang = e * Math.PI * 2;
    ctx.clearRect(0, 0, W, H);

    // parte já gravada
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, W, -Math.PI / 2, -Math.PI / 2 + ang);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0, W, H);
    ctx.restore();

    // frente do laser: pontos quentes e faíscas
    if (t < 1) {
      ctx.globalCompositeOperation = 'lighter';
      const b = Math.floor(e * N) % N;
      for (let k = -2; k <= 0; k++) {
        const lista = baldes[(b + k + N) % N];
        const forca = 1 + k * 0.35;
        for (let i = 0; i < lista.length; i += 2) {
          if (Math.random() > 0.55) continue;
          ctx.fillStyle = `rgba(255, ${190 + Math.random() * 60 | 0}, 120, ${0.55 * forca})`;
          ctx.fillRect(lista[i] - 1.5, lista[i + 1] - 1.5, 4, 4);
          if (Math.random() < 0.03) faiscas.push({ x: lista[i], y: lista[i + 1], vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1, v: 1 });
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = faiscas.length - 1; i >= 0; i--) {
      const f = faiscas[i];
      f.x += f.vx; f.y += f.vy; f.vy += 0.25; f.v -= 0.03;
      if (f.v <= 0) { faiscas.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255, 210, 140, ${f.v})`;
      ctx.fillRect(f.x, f.y, 2.2, 2.2);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (t < 1 || faiscas.length) requestAnimationFrame(quadro);
    else canvas.classList.add('gravado');
  }

  return {
    gravar() {
      if (rodando) return;
      rodando = true;
      inicio = performance.now();
      if (pronto) requestAnimationFrame(quadro);
    },
    mostrarPronto() {
      // sem animação (movimento reduzido)
      const desenhar = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H); };
      if (img.complete) desenhar(); else img.addEventListener('load', desenhar);
    },
  };
}
