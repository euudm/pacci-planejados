// Cena principal: chapas de MDF -> corte CNC -> peças explodidas -> cozinha montada.
// Controlada por progresso (0..1) vindo do scroll. Depois vira o configurador de acabamentos.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { materialSelecao, materialPedra, materialMetal, materialRodape, uvMundo, SELECOES } from './materiais.js';

const T = 0.018; // espessura do MDF (m)
const CHAPA = { x: 2.75, z: 1.85 };
const NAVY = 0x0b1424;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const suave = (t) => t * t * (3 - 2 * t);
const suave2 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const faixa = (p, a, b) => clamp01((p - a) / (b - a));
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- projeto da cozinha ----------
function projetoCozinha() {
  const pecas = [];
  const add = (nome, dims, pos, tipo, ordem = 0, extra = {}) =>
    pecas.push({ nome, dims, pos: v3(...pos), tipo, ordem, ...extra });

  function caixa(id, cx, y0, w, h, d, zc, prateleiras = [], ordem = 0) {
    add(`${id}-lat-e`, [T, h, d], [cx - w / 2 + T / 2, y0 + h / 2, zc], 'mdf', ordem);
    add(`${id}-lat-d`, [T, h, d], [cx + w / 2 - T / 2, y0 + h / 2, zc], 'mdf', ordem);
    add(`${id}-base`, [w - 2 * T, T, d], [cx, y0 + T / 2, zc], 'mdf', ordem + 0.02);
    add(`${id}-topo`, [w - 2 * T, T, d], [cx, y0 + h - T / 2, zc], 'mdf', ordem + 0.03);
    add(`${id}-fundo`, [w - 2 * T, h - 2 * T, 0.006], [cx, y0 + h / 2, zc - d / 2 + 0.004], 'mdf', ordem + 0.04);
    prateleiras.forEach((py, i) =>
      add(`${id}-prat${i}`, [w - 2 * T, T, d - 0.04], [cx, y0 + py, zc - 0.015], 'mdf', ordem + 0.05));
  }
  const folga = 0.003;
  function portas(id, cx, y0, w, h, zf, n, ordem, puxador = 'topo') {
    const pw = w / n;
    for (let i = 0; i < n; i++) {
      const x = cx - w / 2 + pw * (i + 0.5);
      add(`${id}-porta${i}`, [pw - folga, h - folga, T], [x, y0 + h / 2, zf + T / 2], 'mdf', ordem, { frente: true });
      const py = puxador === 'topo' ? y0 + h - 0.012 : y0 + 0.012;
      if (puxador === 'lado') {
        const px = i === 0 ? x + pw / 2 - 0.03 : x - pw / 2 + 0.03;
        add(`${id}-pux${i}`, [0.012, h * 0.35, 0.02], [px, y0 + h * 0.55, zf + T + 0.01], 'metal', ordem + 0.1);
      } else {
        add(`${id}-pux${i}`, [pw * 0.55, 0.012, 0.02], [x, py, zf + T + 0.01], 'metal', ordem + 0.1);
      }
    }
  }
  function gavetas(id, cx, y0, w, h, zf, alturas, ordem) {
    let y = y0;
    alturas.forEach((a, i) => {
      const hh = h * a;
      add(`${id}-gav${i}`, [w - folga, hh - folga, T], [cx, y + hh / 2, zf + T / 2], 'mdf', ordem, { frente: true });
      add(`${id}-gpux${i}`, [w * 0.55, 0.012, 0.02], [cx, y + hh - 0.014, zf + T + 0.01], 'metal', ordem + 0.1);
      y += hh;
    });
  }

  // balcão inferior: 3 módulos de 80 cm
  const yB = 0.1, hB = 0.72, dB = 0.56, zB = 0;
  const frenteB = zB + dB / 2;
  caixa('b1', -0.8, yB, 0.8, hB, dB, zB, [0.36], 0);
  caixa('b2', 0, yB, 0.8, hB, dB, zB, [0.36], 0.03);
  caixa('b3', 0.8, yB, 0.8, hB, dB, zB, [0.36], 0.06);
  gavetas('b1', -0.8, yB, 0.8, hB, frenteB, [0.42, 0.33, 0.25], 0.2);
  portas('b2', 0, yB, 0.8, hB, frenteB, 2, 0.22);
  gavetas('b3', 0.8, yB, 0.8, hB, frenteB, [0.5, 0.5], 0.24);

  // aéreos: esquerda e direita com porta, meio é nicho aberto com LED
  const yA = 1.45, hA = 0.7, dA = 0.34, zA = -dB / 2 + dA / 2;
  const frenteA = zA + dA / 2;
  caixa('a1', -0.8, yA, 0.8, hA, dA, zA, [0.35], 0.08);
  caixa('a2', 0, yA, 0.8, hA, dA, zA, [0.35], 0.1);
  caixa('a3', 0.8, yA, 0.8, hA, dA, zA, [0.35], 0.12);
  portas('a1', -0.8, yA, 0.8, hA, frenteA, 2, 0.26, 'base');
  portas('a3', 0.8, yA, 0.8, hA, frenteA, 2, 0.28, 'base');

  // torre quente
  const hT = 2.05;
  caixa('t', 1.5, yB, 0.6, hT, dB, zB, [0.72, 1.3, 1.65], 0.14);
  portas('t1', 1.5, yB, 0.6, 1.25, frenteB, 1, 0.3, 'lado');
  portas('t2', 1.5, yB + 1.25, 0.6, hT - 1.25, frenteB, 1, 0.32, 'lado');

  // fora das chapas
  add('tampo', [2.42, 0.03, 0.62], [0, yB + hB + 0.015, zB + 0.03], 'pedra', 0.18);
  add('frontao', [2.4, yA - (yB + hB + 0.03), 0.012], [0, (yA + yB + hB + 0.03) / 2, -dB / 2 + 0.006], 'pedra', 0.18, { frontao: true });
  add('rodape', [3.0, 0.1, 0.02], [0.3, 0.05, frenteB - 0.05], 'rodape', 0.0);
  add('led', [2.34, 0.006, 0.014], [0, yA - 0.004, frenteA - 0.04], 'led', 0.4);
  add('led-nicho', [0.74, 0.005, 0.012], [0, yA + hA - T - 0.004, frenteA - 0.03], 'led', 0.4);
  return pecas;
}

// empacota as peças de MDF em chapas 2750 x 1850 (prateleira simples)
function empacotar(pecas) {
  const mdf = pecas.filter((p) => p.tipo === 'mdf');
  mdf.forEach((p) => {
    const idx = [0, 1, 2].sort((a, b) => p.dims[a] - p.dims[b]);
    p.eixoFino = idx[0];
    p.eixoB = idx[1];
    p.eixoA = idx[2];
    p.pegA = p.dims[p.eixoA];
    p.pegB = p.dims[p.eixoB];
    p.fino = p.dims[p.eixoFino];
  });
  // fundos (6 mm) numa chapa própria, depois por altura de faixa
  mdf.sort((a, b) => (a.fino < 0.01) - (b.fino < 0.01) || b.pegB - a.pegB);
  const kerf = 0.006;
  let chapa = 0, u = 0, v = 0, alturaLinha = 0, espessuraAnterior = null;
  for (const p of mdf) {
    if (espessuraAnterior !== null && (p.fino < 0.01) !== (espessuraAnterior < 0.01)) {
      chapa++; u = 0; v = 0; alturaLinha = 0;
    }
    espessuraAnterior = p.fino;
    if (u + p.pegA > CHAPA.x) { u = 0; v += alturaLinha + kerf; alturaLinha = 0; }
    if (v + p.pegB > CHAPA.z) { chapa++; u = 0; v = 0; alturaLinha = 0; }
    p.chapa = chapa;
    p.su = u + p.pegA / 2 - CHAPA.x / 2;
    p.sv = v + p.pegB / 2 - CHAPA.z / 2;
    u += p.pegA + kerf;
    alturaLinha = Math.max(alturaLinha, p.pegB);
  }
  return chapa + 1;
}

function quatDeitado(p) {
  const cols = [];
  cols[p.eixoA] = v3(1, 0, 0);
  cols[p.eixoFino] = v3(0, 1, 0);
  cols[p.eixoB] = v3(0, 0, 1);
  const m = new THREE.Matrix4().makeBasis(cols[0], cols[1], cols[2]);
  if (m.determinant() < 0) {
    cols[p.eixoB] = v3(0, 0, -1);
    m.makeBasis(cols[0], cols[1], cols[2]);
  }
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

// ---------- cena ----------
export function criarOficina(canvas, { leve = false, onPronto } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !leve, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, leve ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(NAVY, 1);

  RectAreaLightUniformsLib.init();

  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(NAVY, 7.5, 17);
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);

  // luzes
  cena.add(new THREE.HemisphereLight(0x8fa6c8, 0x2a1d12, 0.55));
  const chave = new THREE.DirectionalLight(0xffe3c0, 2.3);
  chave.position.set(-3.2, 5.5, 4.2);
  chave.castShadow = true;
  chave.shadow.mapSize.set(leve ? 1024 : 2048, leve ? 1024 : 2048);
  Object.assign(chave.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -2, near: 1, far: 16 });
  chave.shadow.bias = -0.0004;
  chave.shadow.normalBias = 0.02;
  cena.add(chave);
  const recorte = new THREE.DirectionalLight(0x9fb8ff, 0.9);
  recorte.position.set(4, 3, -3);
  cena.add(recorte);

  // piso e parede
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x111c2e, roughness: 0.92 }),
  );
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  cena.add(piso);
  const parede = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 6),
    new THREE.MeshStandardMaterial({ color: 0x14213a, roughness: 0.95 }),
  );
  parede.position.set(0.3, 3, -0.31);
  parede.receiveShadow = true;
  cena.add(parede);

  // LED (luz de área sob os aéreos)
  const luzLed = new THREE.RectAreaLight(0xffc98a, 0, 2.3, 0.08);
  luzLed.position.set(0, 1.44, 0.0);
  luzLed.lookAt(0, 0, 0.05);
  cena.add(luzLed);
  const luzNicho = new THREE.PointLight(0xffc98a, 0, 1.2, 2);
  luzNicho.position.set(0, 2.05, -0.05);
  cena.add(luzNicho);

  // materiais
  let selecaoAtual = 'freijo';
  const matMdf = materialSelecao(selecaoAtual, renderer, leve);
  const matPedra = materialPedra();
  const matMetal = materialMetal();
  const matRodape = materialRodape();
  const matLed = new THREE.MeshBasicMaterial({ color: 0x2a2116 });

  // peças
  const pecas = projetoCozinha();
  const nChapas = empacotar(pecas);
  const centro = v3(0.3, 1.0, 0);
  const grupo = new THREE.Group();
  cena.add(grupo);

  let rng = 7;
  const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);

  for (const p of pecas) {
    const geo = new THREE.BoxGeometry(...p.dims);
    if (p.tipo === 'mdf') uvMundo(geo, p.pos);
    if (p.tipo === 'pedra') uvMundo(geo, p.pos, 1 / 1.6);
    const mat = p.tipo === 'mdf' ? matMdf : p.tipo === 'pedra' ? matPedra : p.tipo === 'metal' ? matMetal
      : p.tipo === 'rodape' ? matRodape : matLed;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = p.tipo !== 'led';
    mesh.receiveShadow = true;
    grupo.add(mesh);
    p.mesh = mesh;
    p.qF = new THREE.Quaternion();

    if (p.tipo === 'mdf') {
      // linha de corte dourada
      const linhas = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0xffc37a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      mesh.add(linhas);
      p.linhas = linhas;
      p.qS = quatDeitado(p);
      const yTopoPilha = 0.1 + nChapas * (T + 0.001);
      p.S = v3(p.su, 0.1 + (nChapas - 1 - p.chapa) * (T + 0.001) + p.fino / 2, p.sv);
      p.ehTopo = p.chapa === 0;
      // explodido: afasta do centro e vem pra frente
      const dir = p.pos.clone().sub(centro);
      dir.z = Math.abs(dir.z) + 0.4;
      dir.normalize();
      p.E = p.pos.clone().addScaledVector(dir, 0.55 + rand() * 0.35);
      p.E.y += 0.25 + rand() * 0.3;
      if (p.frente) p.E.z += 0.9 + rand() * 0.4;
      p.qE = new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.7, (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.4));
      p.atrasoSubida = (p.chapa / Math.max(1, nChapas - 1)) * 0.06 + rand() * 0.05;
      p.atrasoMontagem = p.ordem * 0.32 + rand() * 0.03;
      p.yTopoPilha = yTopoPilha;
    }
  }
  const nMdf = pecas.filter((p) => p.tipo === 'mdf').length;

  // palete
  const palete = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.1, 1.95), new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.9 }));
  palete.position.set(0, 0.05, 0);
  palete.castShadow = palete.receiveShadow = true;
  cena.add(palete);
  const yTopo = 0.1 + nChapas * (T + 0.001);

  // pórtico CNC + cabeçote + feixe + faíscas
  const portico = new THREE.Group();
  const matPort = new THREE.MeshStandardMaterial({ color: 0x2c3442, metalness: 0.8, roughness: 0.35 });
  const viga = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 2.3), matPort);
  const cabecote = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), matPort);
  const bico = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.06, 12), materialMetal());
  bico.position.y = -0.1;
  cabecote.add(bico);
  const feixe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0025, 0.0025, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  portico.add(viga, cabecote, feixe);
  const luzLaser = new THREE.PointLight(0xffa64d, 0, 1.6, 2);
  cena.add(luzLaser);
  cena.add(portico);

  const NF = leve ? 160 : 420;
  const fPos = new Float32Array(NF * 3), fVel = new Float32Array(NF * 3), fVida = new Float32Array(NF);
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const faiscas = new THREE.Points(fGeo, new THREE.PointsMaterial({
    color: 0xffc06a, size: 0.018, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  faiscas.frustumCulled = false;
  cena.add(faiscas);
  let fIdx = 0;
  function emitir(x, y, z, n) {
    for (let k = 0; k < n; k++) {
      const i = fIdx++ % NF;
      fPos[i * 3] = x; fPos[i * 3 + 1] = y; fPos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.6;
      fVel[i * 3] = Math.cos(a) * s; fVel[i * 3 + 1] = 0.8 + Math.random() * 1.8; fVel[i * 3 + 2] = Math.sin(a) * s;
      fVida[i] = 0.35 + Math.random() * 0.4;
    }
  }
  function atualizarFaiscas(dt) {
    for (let i = 0; i < NF; i++) {
      if (fVida[i] <= 0) { fPos[i * 3 + 1] = -10; continue; }
      fVida[i] -= dt;
      fVel[i * 3 + 1] -= 6.5 * dt;
      fPos[i * 3] += fVel[i * 3] * dt;
      fPos[i * 3 + 1] += fVel[i * 3 + 1] * dt;
      fPos[i * 3 + 2] += fVel[i * 3 + 2] * dt;
      if (fPos[i * 3 + 1] < yTopo) { fPos[i * 3 + 1] = yTopo; fVel[i * 3 + 1] *= -0.3; fVel[i * 3] *= 0.6; fVel[i * 3 + 2] *= 0.6; }
    }
    fGeo.attributes.position.needsUpdate = true;
  }

  // varredura de troca de acabamento
  const varredura = new THREE.Mesh(
    new THREE.PlaneGeometry(0.012, 2.5),
    new THREE.MeshBasicMaterial({ color: 0xffd39a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  varredura.position.set(-2, 1.15, 0.45);
  cena.add(varredura);
  const luzVarre = new THREE.PointLight(0xffc27a, 0, 2.2, 2);
  cena.add(luzVarre);
  let troca = null;

  // ---------- câmera ----------
  const K = [
    { p: 0.0, pos: v3(0.0, 3.7, 2.4), olho: v3(0, 0.1, 0.05) },
    { p: 0.3, pos: v3(1.1, 2.9, 3.0), olho: v3(0.1, 0.15, 0) },
    { p: 0.5, pos: v3(0.6, 2.2, 6.2), olho: v3(0.3, 1.05, 0) },
    { p: 0.8, pos: v3(1.9, 1.8, 6.4), olho: v3(0.05, 1.05, 0) },
    { p: 1.0, pos: v3(2.4, 1.6, 6.1), olho: v3(-0.15, 1.08, 0) },
  ];
  const camPos = v3(), camOlho = v3();
  function chaveCamera(p) {
    for (let i = 0; i < K.length - 1; i++) {
      const a = K[i], b = K[i + 1];
      if (p <= b.p || i === K.length - 2) {
        const t = suave2(clamp01((p - a.p) / (b.p - a.p)));
        camPos.lerpVectors(a.pos, b.pos, t);
        camOlho.lerpVectors(a.olho, b.olho, t);
        return;
      }
    }
  }

  // ---------- estado ----------
  let alvoP = 0, p = 0, alvoFoco = 0, foco = 0;
  let largura = 1, altura = 1, aspecto = 1;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  let ativo = true, raf = 0, ultimo = performance.now(), tempo = 0;
  const tmpQ = new THREE.Quaternion(), tmpV = v3();

  function redimensionar() {
    largura = canvas.clientWidth || window.innerWidth;
    altura = canvas.clientHeight || window.innerHeight;
    aspecto = largura / altura;
    renderer.setSize(largura, altura, false);
    camera.aspect = aspecto;
    camera.fov = aspecto < 1 ? 42 : 34;
    camera.updateProjectionMatrix();
  }

  function atualizarPecas(pp, dt) {
    const fCorte = faixa(pp, 0.08, 0.3);
    const laserX = -CHAPA.x / 2 - 0.1 + fCorte * (CHAPA.x + 0.2);
    let cortadas = 0;
    for (const pc of pecas) {
      const m = pc.mesh;
      if (pc.tipo === 'mdf') {
        const corte = clamp01((laserX - (pc.su - pc.pegA / 2)) / 0.25);
        if (corte > 0.5) cortadas++;
        const sobe = suave(faixa(pp, 0.31 + pc.atrasoSubida, 0.47 + pc.atrasoSubida));
        const monta = suave2(faixa(pp, 0.53 + pc.atrasoMontagem, 0.66 + pc.atrasoMontagem));
        // posição na chapa, com afastamento de corte
        tmpV.copy(pc.S);
        tmpV.x += pc.su * 0.035 * corte;
        tmpV.z += pc.sv * 0.05 * corte;
        if (monta > 0) {
          m.position.lerpVectors(pc.E, pc.pos, monta);
          m.quaternion.slerpQuaternions(pc.qE, pc.qF, monta);
        } else {
          m.position.lerpVectors(tmpV, pc.E, sobe);
          m.position.y += Math.sin(sobe * Math.PI) * 0.5;
          m.quaternion.slerpQuaternions(pc.qS, pc.qE, sobe);
        }
        // brilho do corte: acende no corte, segura na explosão, apaga na montagem
        const pulso = corte * (1 - faixa(pp, 0.36, 0.5) * 0.65) * (1 - monta);
        pc.linhas.material.opacity = (pc.ehTopo || sobe > 0 ? 1 : 0.15) * pulso * 0.9;
        pc.linhas.visible = pc.linhas.material.opacity > 0.01;
      } else if (pc.tipo === 'pedra') {
        const t = pc.frontao ? suave2(faixa(pp, 0.7, 0.82)) : suave2(faixa(pp, 0.75, 0.88));
        m.visible = t > 0;
        if (pc.frontao) {
          m.position.set(pc.pos.x, pc.pos.y, pc.pos.z + (1 - t) * 1.4);
          m.rotation.set(0, (1 - t) * 0.5, 0);
        } else {
          m.position.set(pc.pos.x, pc.pos.y + (1 - t) * 2.6, pc.pos.z + (1 - t) * 0.6);
          m.rotation.set((1 - t) * 0.35, 0, (1 - t) * -0.12);
        }
      } else if (pc.tipo === 'rodape') {
        const t = suave(faixa(pp, 0.52, 0.62));
        m.visible = t > 0;
        m.position.set(pc.pos.x, pc.pos.y - (1 - t) * 0.12, pc.pos.z);
      } else if (pc.tipo === 'metal') {
        const t = suave(faixa(pp, 0.86, 0.95));
        m.visible = t > 0.001;
        m.scale.set(Math.max(0.001, t), 1, 1);
        m.position.copy(pc.pos);
      } else if (pc.tipo === 'led') {
        m.position.copy(pc.pos);
        m.visible = pp > 0.6;
      }
    }

    // palete afunda depois que as peças saem
    const sai = suave(faixa(pp, 0.42, 0.55));
    palete.position.y = 0.05 - sai * 0.3;
    palete.visible = sai < 1;

    // pórtico
    const entra = suave(faixa(pp, 0.03, 0.09)), saiP = suave(faixa(pp, 0.3, 0.36));
    const portVis = entra * (1 - saiP);
    portico.visible = portVis > 0.001;
    const hPort = yTopo + 0.38 + (1 - portVis) * 1.6;
    viga.position.set(laserX, hPort, 0);
    const zCab = Math.sin(tempo * 7.5) * 0.85;
    cabecote.position.set(laserX, hPort - 0.1, zCab);
    const cortando = fCorte > 0 && fCorte < 1 && portVis > 0.9;
    feixe.visible = cortando;
    const comp = hPort - 0.2 - yTopo;
    feixe.scale.y = Math.max(0.001, comp);
    feixe.position.set(laserX, yTopo + comp / 2, zCab);
    luzLaser.position.set(laserX, yTopo + 0.05, zCab);
    luzLaser.intensity = cortando ? 2.2 + Math.random() * 1.4 : 0;
    if (cortando && ativo) emitir(laserX, yTopo + 0.003, zCab, leve ? 2 : 5);
    atualizarFaiscas(dt);

    // LED acende no fim
    const led = suave(faixa(pp, 0.9, 0.99));
    luzLed.intensity = led * 9;
    luzNicho.intensity = led * 1.6;
    matLed.color.setRGB(0.16 + led * 1.0, 0.13 + led * 0.78, 0.09 + led * 0.48);

    return { cortadas, total: nMdf, fCorte };
  }

  function quadro(agora) {
    raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - ultimo) / 1000);
    ultimo = agora;
    tempo += dt;
    if (!ativo) return;

    p += (alvoP - p) * Math.min(1, dt * 5.5);
    if (Math.abs(alvoP - p) < 0.0004) p = alvoP;
    foco += (alvoFoco - foco) * Math.min(1, dt * 4);

    estado = atualizarPecas(p, dt);

    // câmera: trilho do scroll + desvio do configurador + paralaxe do mouse
    chaveCamera(p);
    const retrato = aspecto < 1;
    if (foco > 0.001) {
      const posConf = retrato ? v3(2.6, 2.2, 7.6) : v3(1.6, 1.5, 6.2);
      const olhoConf = retrato ? v3(0.35, 0.15, 0) : v3(-1.05, 1.05, 0);
      const f = suave2(foco);
      camPos.lerp(posConf, f);
      camOlho.lerp(olhoConf, f);
    }
    if (retrato) {
      // afasta em telas verticais pra caber a cozinha inteira
      // e mira abaixo do móvel, pra ele subir pra metade de cima (texto fica embaixo)
      tmpV.copy(camPos).sub(camOlho).multiplyScalar(1 + (1 / aspecto - 1) * 0.85);
      camPos.copy(camOlho).add(tmpV);
      camOlho.x += 0.45 * suave(faixa(p, 0.6, 1)) * (1 - suave2(foco));
      const desce = 0.75 * (1 - suave2(foco));
      camOlho.y -= desce;
      camPos.y -= desce * 0.4;
    }
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 3);
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 3);
    camera.position.set(camPos.x + mouse.sx * 0.25, camPos.y - mouse.sy * 0.15, camPos.z);
    camera.lookAt(camOlho);

    // troca de acabamento em varredura
    if (troca) {
      troca.t += dt / 1.1;
      const x = -1.5 + troca.t * 3.6;
      varredura.position.x = x;
      luzVarre.position.set(x, 1.1, 0.6);
      const env = Math.sin(clamp01(troca.t) * Math.PI);
      varredura.material.opacity = env;
      luzVarre.intensity = env * 3;
      for (const pc of pecas) {
        if (pc.tipo === 'mdf' && pc.mesh.material !== troca.mat && x > pc.pos.x - pc.dims[0] / 2) {
          pc.mesh.material = troca.mat;
        }
      }
      if (troca.t >= 1) {
        varredura.material.opacity = 0;
        luzVarre.intensity = 0;
        troca = null;
      }
    }

    renderer.render(cena, camera);
  }
  let estado = { cortadas: 0, total: nMdf, fCorte: 0 };

  redimensionar();
  window.addEventListener('resize', redimensionar);
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // primeiro quadro e depois o loop
  atualizarPecas(0, 0);
  chaveCamera(0);
  camera.position.copy(camPos);
  camera.lookAt(camOlho);
  renderer.compile(cena, camera);
  renderer.render(cena, camera);
  raf = requestAnimationFrame(quadro);
  onPronto?.();

  // pré-gera as outras seleções no tempo ocioso
  const ocioso = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  SELECOES.filter((s) => s.id !== selecaoAtual).forEach((s, i) =>
    ocioso(() => materialSelecao(s.id, renderer, leve), { timeout: 4000 + i * 800 }));

  return {
    set progresso(v) { alvoP = clamp01(v); },
    get progresso() { return p; },
    set foco(v) { alvoFoco = clamp01(v); },
    get estado() { return estado; },
    set ativo(v) { ativo = v; },
    get ativo() { return ativo; },
    selecao(id) {
      if (id === selecaoAtual) return;
      selecaoAtual = id;
      troca = { t: 0, mat: materialSelecao(id, renderer, leve) };
    },
    destruir() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
}
