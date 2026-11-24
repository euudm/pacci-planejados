// Mapa estilizado dos bairros com obra (posições reais, centro expandido pra caber).
import { gsap } from 'gsap';
import obras from '../data/obras.json';
import { AMBIENTES } from './gavetas.js';

const COORD = {
  'Aldeia da Serra': [-23.457, -46.905],
  'Alphaville': [-23.497, -46.849],
  'Barueri': [-23.511, -46.876],
  'Arujá': [-23.396, -46.321],
  'Tatuapé': [-23.540, -46.576],
  'Morumbi': [-23.600, -46.720],
  'Santo Amaro': [-23.652, -46.709],
  'Campo Belo': [-23.626, -46.669],
  'Brooklin': [-23.613, -46.693],
  'Itaim Bibi': [-23.585, -46.676],
  'Pinheiros': [-23.566, -46.692],
  'Vila Mariana': [-23.589, -46.634],
  'Liberdade': [-23.558, -46.634],
  'Bela Vista': [-23.561, -46.649],
  'Consolação': [-23.549, -46.662],
  'Augusta': [-23.556, -46.657],
};
const CENTRO = [-23.565, -46.66];
const SVGNS = 'http://www.w3.org/2000/svg';

// projeção com lente: o miolo de SP abre, as pontas encolhem
function projetar([lat, lon]) {
  const kx = Math.cos((CENTRO[0] * Math.PI) / 180);
  const dx = (lon - CENTRO[1]) * kx, dy = -(lat - CENTRO[0]);
  const r = Math.hypot(dx, dy);
  const rr = r === 0 ? 0 : Math.pow(r / 0.33, 0.5) * 0.33;
  const s = r === 0 ? 0 : rr / r;
  return [500 + dx * s * 1300, 270 + dy * s * 1300];
}

const el = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

export function montarMapa() {
  const svg = document.getElementById('mapa-svg');
  const card = document.getElementById('mapa-card');
  const cardImg = card.querySelector('img');
  const cardRot = card.querySelector('figcaption span');
  const cardNome = card.querySelector('figcaption strong');
  const nomeAmb = Object.fromEntries(AMBIENTES.map((a) => [a.cat, a.nome]));

  // agrupa obras por bairro
  const porBairro = {};
  obras.forEach((o) => { if (o.bairro && COORD[o.bairro]) (porBairro[o.bairro] ||= []).push(o); });
  const bairros = Object.keys(porBairro).map((nome) => {
    const [x, y] = projetar(COORD[nome]);
    const cats = [...new Set(porBairro[nome].map((o) => nomeAmb[o.cat]))];
    return { nome, x, y, fotos: porBairro[nome], cats };
  });
  // rota pelo vizinho mais próximo, saindo do ponto mais a oeste
  const resto = [...bairros].sort((a, b) => a.x - b.x);
  const ordem = [resto.shift()];
  while (resto.length) {
    const u = ordem[ordem.length - 1];
    let k = 0, melhor = Infinity;
    resto.forEach((b, i) => { const dd = Math.hypot(b.x - u.x, b.y - u.y); if (dd < melhor) { melhor = dd; k = i; } });
    ordem.push(resto.splice(k, 1)[0]);
  }
  bairros.splice(0, bairros.length, ...ordem);

  // grade técnica
  const grade = el('g', { class: 'mapa-grade' });
  for (let x = 0; x <= 1000; x += 50) grade.appendChild(el('line', { x1: x, y1: 0, x2: x, y2: 520 }));
  for (let y = 10; y <= 520; y += 50) grade.appendChild(el('line', { x1: 0, y1: y, x2: 1000, y2: y }));
  svg.appendChild(grade);
  const aneis = el('g', { class: 'mapa-aneis' });
  [70, 150, 250, 380].forEach((r) => aneis.appendChild(el('circle', { cx: 500, cy: 270, r })));
  svg.appendChild(aneis);
  const norte = el('text', { x: 960, y: 40, class: 'mapa-norte' });
  norte.textContent = 'N';
  svg.appendChild(norte);
  svg.appendChild(el('line', { x1: 964, y1: 48, x2: 964, y2: 80, class: 'mapa-norte-l' }));

  // rota de oeste a leste
  let d = `M ${bairros[0].x} ${bairros[0].y}`;
  for (let i = 1; i < bairros.length; i++) {
    const a = bairros[i - 1], b = bairros[i];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const curva = 0.18 * (i % 2 ? 1 : -1);
    d += ` Q ${mx - (b.y - a.y) * curva} ${my + (b.x - a.x) * curva}, ${b.x} ${b.y}`;
  }
  const rota = el('path', { d, class: 'mapa-rota' });
  svg.appendChild(rota);

  const pontos = el('g', { class: 'mapa-pontos' });
  svg.appendChild(pontos);
  const nodos = bairros.map((b) => {
    const g = el('g', { class: 'mapa-ponto', transform: `translate(${b.x} ${b.y})`, tabindex: '0', role: 'button', 'aria-label': `${b.nome}: ${b.fotos.length} fotos de obra` });
    g.appendChild(el('circle', { r: 16, class: 'mp-pulso' }));
    g.appendChild(el('circle', { r: 5.5, class: 'mp-nucleo' }));
    const t = el('text', { x: 10, y: -10, class: 'mp-rot' });
    t.textContent = b.nome;
    g.appendChild(t);
    pontos.appendChild(g);
    const mostrar = () => {
      const o = b.fotos[0];
      cardImg.src = `/obras/${o.id}-800.webp`;
      cardImg.alt = `Obra em ${b.nome}`;
      cardRot.textContent = `${b.cats.join(' · ')}  ·  ${b.fotos.length} fotos`;
      cardNome.textContent = b.nome;
      const box = svg.getBoundingClientRect();
      const px = (b.x / 1000) * box.width, py = (b.y / 520) * box.height;
      card.style.setProperty('--x', `${px}px`);
      card.style.setProperty('--y', `${py}px`);
      card.classList.toggle('esq', px > box.width * 0.6);
      card.classList.add('on');
      nodos.forEach((n) => n.classList.toggle('ativo', n === g));
    };
    g.addEventListener('pointerenter', mostrar);
    g.addEventListener('focus', mostrar);
    g.addEventListener('click', mostrar);
    return g;
  });
  svg.addEventListener('pointerleave', () => {
    card.classList.remove('on');
    nodos.forEach((n) => n.classList.remove('ativo'));
  });

  // entrada animada
  const comp = rota.getTotalLength();
  rota.style.strokeDasharray = comp;
  rota.style.strokeDashoffset = comp;
  gsap.set(nodos, { opacity: 0, scale: 0.2, transformOrigin: 'center' });
  const contador = document.getElementById('obras-n');
  let feito = false;
  return {
    total: bairros.length,
    animar() {
      if (feito) return;
      feito = true;
      const tl = gsap.timeline();
      tl.to(rota, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut' }, 0);
      tl.to(nodos, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(3)', stagger: 2.4 / nodos.length }, 0.1);
      const obj = { n: 0 };
      tl.to(obj, { n: bairros.length, duration: 2.4, ease: 'none', onUpdate: () => { contador.textContent = Math.round(obj.n); } }, 0.1);
    },
  };
}
