// Texturas das seleções de acabamento, geradas em canvas puro (sem Three.js),
// pra poderem ser usadas tanto no 3D quanto no DOM.

export const SELECOES = [
  { id: 'freijo', nome: 'Freijó', uso: 'cozinhas', cor: '#9a6a43', tipo: 'madeira',
    claro: [176, 128, 86], escuro: [104, 66, 38], rough: 0.62, coat: 0.15 },
  { id: 'beige', nome: 'Beige Matt', uso: 'homes de TV', cor: '#d8c8ae', tipo: 'liso',
    base: [216, 200, 174], rough: 0.88, coat: 0 },
  { id: 'moss', nome: 'Moss Essencial', uso: 'quartos', cor: '#8f9a86', tipo: 'liso',
    base: [143, 154, 134], rough: 0.82, coat: 0 },
  { id: 'cristallo', nome: 'Branco Cristallo', uso: 'banheiros', cor: '#efece6', tipo: 'liso',
    base: [238, 235, 229], rough: 0.22, coat: 0.6 },
  { id: 'malva', nome: 'Carvalho Malva', uso: 'comerciais', cor: '#bda283', tipo: 'madeira',
    claro: [206, 182, 150], escuro: [150, 122, 92], rough: 0.7, coat: 0.05 },
];

// ruído de valor simples, determinístico
export function criaRuido(seed = 1) {
  const p = new Uint8Array(512);
  let s = seed * 9301 + 49297;
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t) => t * t * (3 - 2 * t);
  const h = (x, y) => p[p[x & 255] + (y & 255)] / 255;
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function canvasCinza(arr, W, H) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export function texturaMadeira(sel, W, H) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  const rough = new Uint8ClampedArray(W * H);
  const n = criaRuido(sel.id.length * 7);
  const esc = 512 / W; // mantém o desenho do veio em qualquer resolução
  const [cr, cg, cb] = sel.claro, [er, eg, eb] = sel.escuro;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const X = x * esc, Y = y * esc;
      // veio fino e quase reto, com fibras longas (MDF com lâmina de madeira)
      const warp = n(X * 0.008, Y * 0.0016) * 26 + n(X * 0.05, Y * 0.008) * 3;
      const freq = 0.11 + n(X * 0.003, 0.5) * 0.12; // largura do veio varia pela chapa
      const anel = Math.sin((X + warp) * freq + n(X * 0.006, Y * 0.0012) * 6);
      let t = Math.pow(Math.abs(anel), 8) * 0.3;
      const fibra = n(X * 1.4, Y * 0.012) * 0.6 + n(X * 3.1, Y * 0.03) * 0.4;
      const mancha = n(X * 0.006, Y * 0.0012);
      t = Math.min(1, t + fibra * 0.3 + mancha * 0.42);
      const i = (y * W + x) * 4;
      img.data[i] = cr + (er - cr) * t;
      img.data[i + 1] = cg + (eg - cg) * t;
      img.data[i + 2] = cb + (eb - cb) * t;
      img.data[i + 3] = 255;
      rough[y * W + x] = 150 + t * 80;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { cor: cv, rough: canvasCinza(rough, W, H) };
}

export function texturaLisa(sel, W, H) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  const n = criaRuido(sel.id.length * 13);
  const [r, g, b] = sel.base;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = (n(x * 0.05, y * 0.05) - 0.5) * 7 + (Math.random() - 0.5) * 4;
      const i = (y * W + x) * 4;
      img.data[i] = r + v; img.data[i + 1] = g + v; img.data[i + 2] = b + v; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { cor: cv, rough: null };
}

export function texturaPedra(W = 512, H = 512) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  const n = criaRuido(42);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const w = n(x * 0.01, y * 0.01) * 6 + n(x * 0.04, y * 0.04) * 1.5;
      const veio = Math.pow(1 - Math.abs(Math.sin((x * 0.6 + y) * 0.006 + w * 0.5)), 40);
      const v = 238 - veio * 38 - n(x * 0.2, y * 0.2) * 6;
      const i = (y * W + x) * 4;
      img.data[i] = v; img.data[i + 1] = v - 2; img.data[i + 2] = v - 5; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export function texturaSelecao(id, W, H) {
  const sel = SELECOES.find((s) => s.id === id);
  return sel.tipo === 'madeira' ? texturaMadeira(sel, W, H) : texturaLisa(sel, 128, 128);
}

// textura como imagem (frentes das gavetas, amostras)
export function texturaComoURL(id, W = 256, H = 512) {
  const sel = SELECOES.find((s) => s.id === id);
  const tx = sel.tipo === 'madeira' ? texturaMadeira(sel, W, H) : texturaLisa(sel, 64, 64);
  return tx.cor.toDataURL('image/jpeg', 0.82);
}
