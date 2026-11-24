// Gaveta com fechamento suave: arraste pra abrir, solte e ela recolhe sozinha,
// desacelerando nos últimos centímetros (amortecedor).
import * as THREE from 'three';
import { materialSelecao, materialPedra, uvMundo } from './materiais.js';

const T = 0.018;
const MAX = 0.42;      // abertura máxima (m)
const ZONA = 0.07;     // zona do amortecedor (m)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function criarFerragem(canvas, ui, { leve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, leve ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // sem mapa de ambiente (PMREM travava a página ~5 s ao criar a cena);
  // o visual claro vem de luzes simples
  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);

  cena.add(new THREE.HemisphereLight(0xfff4e4, 0x6a5a48, 1.35));
  const preenche = new THREE.DirectionalLight(0xfff6ea, 0.9);
  preenche.position.set(2.5, 1.6, 2.4);
  cena.add(preenche);
  const contra = new THREE.DirectionalLight(0xffffff, 0.5);
  contra.position.set(0.5, 2.5, -2);
  cena.add(contra);
  const sol = new THREE.DirectionalLight(0xfff0dc, 2.2);
  sol.position.set(-1.6, 3, 2.2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -1.2, right: 1.2, top: 1.5, bottom: -0.5, near: 0.5, far: 8 });
  sol.shadow.bias = -0.0005;
  cena.add(sol);

  // chão que recebe só sombra
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.22 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);

  let matFrente = materialSelecao('freijo', renderer, leve);
  const matInterno = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.8 });
  // sem ambiente, metal 100% fica preto: metal "fosco" que pega as luzes
  const matMetal = new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: 0.55, roughness: 0.35 });
  const matTrilho = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.45, roughness: 0.3 });
  const frentes = [];

  function caixa(dims, pos, mat, pai = cena, uv = false) {
    const g = new THREE.BoxGeometry(...dims);
    if (uv) uvMundo(g, new THREE.Vector3(...pos));
    const m = new THREE.Mesh(g, mat);
    m.position.set(...pos);
    m.castShadow = m.receiveShadow = true;
    pai.add(m);
    return m;
  }

  // módulo: 60 x 72 x 56, sobre rodapé de 10 cm
  const W = 0.6, H = 0.72, D = 0.56, y0 = 0.1;
  caixa([T, H, D], [-W / 2 + T / 2, y0 + H / 2, 0], matInterno);
  caixa([T, H, D], [W / 2 - T / 2, y0 + H / 2, 0], matInterno);
  caixa([W - 2 * T, T, D], [0, y0 + T / 2, 0], matInterno);
  caixa([W, 0.006, H], [0, y0 + H / 2, -D / 2], matInterno).rotation.x = Math.PI / 2;
  caixa([W + 0.02, 0.03, D + 0.04], [0, y0 + H + 0.015, 0.02], materialPedra());
  caixa([W, 0.1, 0.02], [0, 0.05, D / 2 - 0.05], new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.7 }));
  // laterais externas no acabamento escolhido
  frentes.push(caixa([0.004, H, D], [-W / 2 - 0.002, y0 + H / 2, 0], matFrente, cena, true));
  frentes.push(caixa([0.004, H, D], [W / 2 + 0.002, y0 + H / 2, 0], matFrente, cena, true));

  // gaveta inferior (fixa)
  const hInf = 0.4;
  frentes.push(caixa([W - 0.004, hInf - 0.004, T], [0, y0 + hInf / 2, D / 2 + T / 2], matFrente, cena, true));
  caixa([W * 0.55, 0.012, 0.02], [0, y0 + hInf - 0.016, D / 2 + T + 0.01], matMetal);

  // gaveta superior (móvel)
  const gaveta = new THREE.Group();
  cena.add(gaveta);
  const hSup = H - hInf, yS = y0 + hInf;
  const frente = caixa([W - 0.004, hSup - 0.004, T], [0, yS + hSup / 2, D / 2 + T / 2], matFrente, gaveta, true);
  frentes.push(frente);
  caixa([W * 0.55, 0.012, 0.02], [0, yS + hSup - 0.016, D / 2 + T + 0.01], matMetal, gaveta);
  const hc = hSup - 0.07, prof = D - 0.06;
  caixa([0.014, hc, prof], [-W / 2 + 0.045, yS + 0.03 + hc / 2, D / 2 - prof / 2], matInterno, gaveta);
  caixa([0.014, hc, prof], [W / 2 - 0.045, yS + 0.03 + hc / 2, D / 2 - prof / 2], matInterno, gaveta);
  caixa([W - 0.09, 0.01, prof], [0, yS + 0.03, D / 2 - prof / 2], matInterno, gaveta);
  caixa([W - 0.09, hc, 0.014], [0, yS + 0.03 + hc / 2, D / 2 - prof], matInterno, gaveta);
  // corrediças
  caixa([0.012, 0.035, prof], [-W / 2 + 0.03, yS + 0.05, D / 2 - prof / 2], matTrilho, gaveta);
  caixa([0.012, 0.035, prof], [W / 2 - 0.03, yS + 0.05, D / 2 - prof / 2], matTrilho, gaveta);
  caixa([0.01, 0.03, D - 0.04], [-W / 2 + 0.022, yS + 0.05, 0], matTrilho);
  caixa([0.01, 0.03, D - 0.04], [W / 2 - 0.022, yS + 0.05, 0], matTrilho);
  // conteúdo: potes
  const matPote = new THREE.MeshPhysicalMaterial({ color: 0xf3efe8, roughness: 0.25, clearcoat: 0.6 });
  [[-0.14, 0.12, 0.07], [0.0, 0.1, 0.05], [0.13, 0.15, 0.06], [-0.05, -0.08, 0.055], [0.12, -0.1, 0.045]].forEach(([x, z, r], i) => {
    const pote = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.09 + i * 0.012, 28), matPote);
    pote.position.set(x, yS + 0.08 + (0.09 + i * 0.012) / 2, D / 2 - prof / 2 + z);
    pote.castShadow = true;
    gaveta.add(pote);
  });
  // luz interna que acende ao abrir
  const luzInterna = new THREE.PointLight(0xffd29a, 0, 0.6, 2);
  luzInterna.position.set(0, yS + hSup - 0.03, 0.15);
  gaveta.add(luzInterna);

  // ---------- física ----------
  let x = 0, v = 0, arrastando = false, soltouEm = 0;
  const hist = new Float32Array(150);
  let hi = 0, ultimaVel = 0;

  function redimensionar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const retrato = w / h < 1;
    camera.position.set(retrato ? 1.4 : 1.25, retrato ? 1.55 : 1.4, retrato ? 2.5 : 1.95);
    camera.lookAt(0, retrato ? 0.66 : 0.45, 0.14);
    camera.updateProjectionMatrix();
  }

  // direção de abertura em pixels de tela
  const pA = new THREE.Vector3(), pB = new THREE.Vector3();
  function dirTela() {
    pA.set(0, yS + hSup / 2, D / 2).project(camera);
    pB.set(0, yS + hSup / 2, D / 2 + 0.1).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dx = (pB.x - pA.x) * w / 2, dy = -(pB.y - pA.y) * h / 2;
    return { dx, dy, len: Math.hypot(dx, dy) };
  }
  let ultimoPonto = null, ultimoT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    arrastando = true;
    ultimoPonto = { x: e.clientX, y: e.clientY };
    ultimoT = performance.now();
    canvas.setPointerCapture(e.pointerId);
    ui.onInteragiu?.();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!arrastando) return;
    const d = dirTela();
    const mx = e.clientX - ultimoPonto.x, my = e.clientY - ultimoPonto.y;
    // no toque só o movimento lateral abre (o vertical fica pra rolar a página)
    const passo = e.pointerType === 'touch'
      ? (mx * Math.sign(d.dx || 1) / Math.max(1, canvas.clientWidth)) * MAX * 1.8
      : ((mx * d.dx + my * d.dy) / (d.len * d.len)) * 0.1;
    const agora = performance.now();
    const nx = clamp(x + passo, 0, MAX);
    v = (nx - x) / Math.max(0.008, (agora - ultimoT) / 1000);
    x = nx;
    ultimoPonto = { x: e.clientX, y: e.clientY };
    ultimoT = agora;
  });
  const soltar = () => {
    if (!arrastando) return;
    arrastando = false;
    soltouEm = performance.now();
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  // demonstração automática ao entrar na tela
  let demo = null;
  function demonstrar() {
    if (arrastando) return;
    demo = { t: 0 };
  }

  function passoFisica(dt) {
    if (demo) {
      demo.t += dt;
      const alvo = Math.min(1, demo.t / 0.9);
      x = MAX * 0.9 * (1 - Math.pow(1 - alvo, 3));
      v = 0;
      if (demo.t > 1.25) { demo = null; soltouEm = performance.now() - 100; }
      return;
    }
    if (arrastando) return;
    if (performance.now() - soltouEm < 90) {
      // inércia curta pra fora, se jogou a gaveta
      if (v > 0) { x = clamp(x + v * dt, 0, MAX); v *= 0.82; return; }
    }
    if (x <= 0) { x = 0; v = 0; return; }
    // empurrão até a zona, depois o amortecedor assume
    const alvoV = x > ZONA ? -1.05 : -(0.035 + x * 1.1);
    const k = x > ZONA ? 7 : 14;
    v += (alvoV - v) * Math.min(1, k * dt);
    x = Math.max(0, x + v * dt);
    if (x < 0.0008) { x = 0; v = 0; }
  }

  let ativo = false, raf = 0, ultimo = performance.now();
  function quadro(agora) {
    raf = requestAnimationFrame(quadro);
    if (!ativo || !compilado) { ultimo = agora; return; }
    const dt = Math.min(0.04, (agora - ultimo) / 1000);
    ultimo = agora;
    passoFisica(dt);
    gaveta.position.z = x;
    luzInterna.intensity = Math.min(1, x / 0.15) * 0.9;

    // gráfico de velocidade (só fechamento)
    const vel = arrastando || demo ? 0 : Math.max(0, -v);
    hist[hi++ % hist.length] = vel;
    ultimaVel += (vel - ultimaVel) * 0.3;
    if (ui.vel) ui.vel.textContent = `${ultimaVel.toFixed(2).replace('.', ',')} m/s`;
    if (ui.linha) {
      let pts = '';
      for (let i = 0; i < hist.length; i++) {
        const val = hist[(hi + i) % hist.length];
        pts += `${(i / (hist.length - 1)) * 300},${68 - Math.min(1, val / 1.1) * 62} `;
      }
      ui.linha.setAttribute('points', pts);
    }
    ui.zona?.classList.toggle('ativa', !arrastando && x > 0 && x <= ZONA);
    renderer.render(cena, camera);
  }

  redimensionar();
  new ResizeObserver(redimensionar).observe(canvas);
  // compila os shaders sem travar a página (paralelo quando a placa suporta)
  let compilado = false;
  renderer.compileAsync(cena, camera).catch(() => {}).finally(() => { compilado = true; });
  raf = requestAnimationFrame(quadro);

  return {
    set ativo(val) { ativo = val; },
    demonstrar,
    selecao(id) {
      matFrente = materialSelecao(id, renderer, leve);
      frentes.forEach((m) => (m.material = matFrente));
    },
  };
}
