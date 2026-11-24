import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import obras from './data/obras.json';
import { SELECOES, texturaComoURL } from './three/texturas.js';
import { montarGavetas } from './modules/gavetas.js';
import { montarMapa } from './modules/mapa.js';
import { montarGravacao } from './modules/gravacao.js';
import { abrirLightbox } from './modules/lightbox.js';

gsap.registerPlugin(ScrollTrigger);
// no celular a barra de endereço muda a altura da tela ao rolar: não recalcular por isso
ScrollTrigger.config({ ignoreMobileResize: true });

const WHATS = '5511997550461';
const MSG = 'Olá! Vim pelo site da Pacci Planejados e quero fazer um orçamento.';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const faixa = (p, a, b) => clamp01((p - a) / (b - a));

const mmMobile = window.matchMedia('(max-width: 900px)');
const toque = window.matchMedia('(pointer: coarse)').matches;
const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const leve = mmMobile.matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

// ---------- WhatsApp ----------
$$('.js-whats').forEach((a) => { a.href = `https://wa.me/${WHATS}?text=${encodeURIComponent(MSG)}`; });

// ---------- scroll suave (desktop) ----------
let lenis = null;
if (!toque && !reduzido) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const alvo = $(a.getAttribute('href'));
  if (!alvo) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(alvo, { duration: 1.6 });
  else alvo.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth' });
}));

// ---------- WebGL disponível? ----------
function temWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
const comGL = temWebGL() && !new URLSearchParams(location.search).has('lite');
if (!comGL) document.body.classList.add('sem-webgl');

// ---------- cena principal ----------
let cena = null;
const cenaPronta = comGL
  ? import('./three/oficina.js').then(({ criarOficina }) => new Promise((ok) => {
      try {
        cena = criarOficina($('#cena'), { leve, onPronto: ok });
      } catch (err) {
        console.warn('[pacci] 3D indisponível', err);
        document.body.classList.add('sem-webgl');
        ok();
      }
    }))
  : Promise.resolve();

// ---------- loader ----------
const loader = $('#loader');
const numEl = $('#ld-num');
const cont = { n: 0 };
const contagem = gsap.to(cont, { n: 2750, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { numEl.textContent = Math.round(cont.n); } });
gsap.set('.titulo-hero .linha > span', { yPercent: 110 });
gsap.set(['.batida-1 .eyebrow', '.hero-sub', '.rolar'], { opacity: 0, y: 20 });

Promise.all([
  document.fonts.ready,
  cenaPronta,
  new Promise((ok) => setTimeout(ok, 1450)),
]).then(() => Promise.race([contagem.then(), new Promise((ok) => setTimeout(ok, 200))]))
  .then(abrirCena);
setTimeout(() => { if (!loader.classList.contains('fim')) abrirCena(); }, 7000);

let cenaAberta = false;
function abrirCena() {
  if (cenaAberta) return;
  cenaAberta = true;
  loader.classList.add('fim');
  const tl = gsap.timeline({ onComplete: () => { loader.remove(); lenis?.start(); } });
  tl.to('.ld-info', { opacity: 0, y: -10, duration: 0.4 }, 0)
    .to('.ld-linha', { width: '100%', duration: 0.75, ease: 'power3.inOut' }, 0.1)
    .to('.ld-cima', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 0.8)
    .to('.ld-baixo', { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, 0.8)
    .to('.ld-linha', { opacity: 0, duration: 0.4 }, 1.0)
    .to('.titulo-hero .linha > span', { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 1.25)
    .to(['.batida-1 .eyebrow', '.hero-sub', '.rolar'], { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, 1.5);
}

// ---------- oficina: progresso do scroll ----------
let pScroll = 0;
ScrollTrigger.create({
  trigger: '.oficina', start: 'top top', end: 'bottom bottom',
  onUpdate: (s) => { pScroll = s.progress; if (cena) cena.progresso = s.progress; },
});

const batidas = [
  { el: $('.batida-1'), i: [-1, 0], o: [0.025, 0.075] },
  { el: $('.batida-2'), i: [0.1, 0.14], o: [0.27, 0.31] },
  { el: $('.batida-3'), i: [0.37, 0.41], o: [0.6, 0.64] },
  { el: $('.batida-4'), i: [0.84, 0.88], o: [2, 3] },
];
const cotaL = $('#cota-l'), cotaA = $('#cota-a'), cotaP = $('#cota-p'), cotaFase = $('#cota-fase');
const barra = $('.progresso-oficina span');
let ultimoP = -1;
gsap.ticker.add(() => {
  const p = cena ? cena.progresso : pScroll;
  if (Math.abs(p - ultimoP) < 0.0002) return;
  ultimoP = p;
  batidas.forEach(({ el, i, o }, k) => {
    const a = faixa(p, i[0], i[1]), b = faixa(p, o[0], o[1]);
    const op = a * (1 - b);
    el.style.opacity = op;
    el.style.visibility = op < 0.01 ? 'hidden' : 'visible';
    const y = (1 - a) * 34 - b * 34;
    el.style.transform = k === 0 || mmMobile.matches ? `translateY(${y}px)` : `translateY(calc(-50% + ${y}px))`;
  });
  barra.style.transform = `scaleX(${p})`;
  const m = faixa(p, 0.3, 0.9);
  cotaL.textContent = Math.round(2750 + (3000 - 2750) * m);
  cotaA.textContent = Math.round(18 + (2150 - 18) * m);
  cotaP.textContent = Math.round(1850 + (620 - 1850) * m);
  const est = cena?.estado;
  cotaFase.textContent =
    p < 0.08 ? 'chapa de mdf'
    : p < 0.31 ? `corte cnc  ${String(est?.cortadas ?? Math.round(faixa(p, 0.08, 0.3) * 57)).padStart(2, '0')}/${est?.total ?? 57} peças`
    : p < 0.53 ? 'peças no ar'
    : p < 0.9 ? 'montagem'
    : 'luz acesa';
});

// ---------- acabamentos ----------
ScrollTrigger.create({
  trigger: '#acabamentos', start: 'top bottom', end: 'top 25%', scrub: true,
  onUpdate: (s) => { if (cena) cena.foco = s.progress; },
});
ScrollTrigger.create({
  trigger: '#ferragem', start: 'top top',
  onEnter: () => { document.body.classList.add('cena-off'); if (cena) cena.ativo = false; },
  onLeaveBack: () => { document.body.classList.remove('cena-off'); if (cena) cena.ativo = true; },
});

let ferragem = null;
const amostras = $('.amostras');
const fichaNome = $('#acab-nome'), fichaUso = $('#acab-uso'), fotosAcab = $('#acab-fotos');
function mostrarFotosSelecao(sel) {
  const lista = obras.filter((o) => o.selecao === sel.nome).slice(0, 3);
  const itens = lista.map((o) => ({ id: o.id, legenda: `Seleção ${sel.nome}`, alt: `Projeto em ${sel.nome}` }));
  fotosAcab.innerHTML = lista.map((o, k) =>
    `<button data-k="${k}" aria-label="Ver foto ${k + 1} da seleção ${sel.nome}"><img src="/obras/${o.id}-800.webp" alt="" loading="lazy" /></button>`).join('');
  $$('button', fotosAcab).forEach((b) => b.addEventListener('click', () => abrirLightbox(itens, Number(b.dataset.k))));
  gsap.fromTo($$('button', fotosAcab), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' });
}
SELECOES.forEach((sel, i) => {
  const b = document.createElement('button');
  b.className = 'amostra';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
  b.setAttribute('aria-label', sel.nome);
  b.style.backgroundColor = sel.cor;
  b.innerHTML = `<span class="mono">${sel.nome}</span>`;
  amostras.appendChild(b);
  const pinta = () => { b.style.backgroundImage = `url(${texturaComoURL(sel.id, 96, 192)})`; };
  (window.requestIdleCallback || setTimeout)(pinta);
  b.addEventListener('click', () => {
    $$('.amostra', amostras).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    fichaNome.textContent = sel.nome;
    fichaUso.textContent = `aplicada em ${sel.uso}`;
    mostrarFotosSelecao(sel);
    cena?.selecao(sel.id);
    ferragem?.selecao(sel.id);
  });
});
mostrarFotosSelecao(SELECOES[0]);

// ---------- ferragem (gaveta 3D) ----------
const ferrCanvas = $('#ferr-canvas');
const ferrDica = $('.ferr-dica');
if (comGL) {
  let criada = false, demoFeita = false;
  new IntersectionObserver(async ([en]) => {
    if (en.isIntersecting && !criada) {
      criada = true;
      const { criarFerragem } = await import('./three/ferragem.js');
      ferragem = criarFerragem(ferrCanvas, {
        vel: $('#ferr-vel'), linha: $('#ferr-linha'), zona: $('.ferr-zona'),
        onInteragiu: () => ferrDica.classList.add('some'),
      }, { leve });
      const atual = $('.amostra[aria-checked="true"]');
      const sel = SELECOES.find((s) => s.nome === atual?.getAttribute('aria-label'));
      if (sel) ferragem.selecao(sel.id);
    }
    if (ferragem) ferragem.ativo = en.isIntersecting;
  }, { rootMargin: '200px' }).observe(ferrCanvas);
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && ferragem && !demoFeita) { demoFeita = true; setTimeout(() => ferragem.demonstrar(), 300); }
  }, { threshold: 0.6 }).observe(ferrCanvas);
} else {
  $('.ferr-palco').style.background = `center / cover url(/obras/cozinhas-p05-08-1600.webp)`;
  $('.ferr-grafico').remove();
  ferrDica.remove();
}

// ---------- pilares: ícones técnicos + rolagem horizontal ----------
const ICONES = {
  projeto: `<svg viewBox="0 0 260 200"><rect class="tr" x="30" y="30" width="200" height="130"/><line class="tr" x1="110" y1="30" x2="110" y2="160"/><line class="tr" x1="110" y1="95" x2="230" y2="95"/><rect class="tr-ouro" x="40" y="40" width="60" height="22"/><line class="tr" x1="30" y1="180" x2="230" y2="180"/><line class="tr" x1="30" y1="175" x2="30" y2="185"/><line class="tr" x1="230" y1="175" x2="230" y2="185"/><text class="cota-t" x="118" y="196">3000</text></svg>`,
  corte: `<svg viewBox="0 0 260 200"><rect class="tr" x="20" y="40" width="220" height="130"/><path class="tr-ouro" d="M20 100 H160 V170 M90 40 V100 M160 100 H240"/><circle class="tr-ouro" cx="160" cy="100" r="5"/><line class="tr" x1="160" y1="10" x2="160" y2="92"/><text class="cota-t" x="168" y="30">laser</text></svg>`,
  ferragem: `<svg viewBox="0 0 260 200"><rect class="tr" x="40" y="40" width="70" height="120"/><path class="tr-ouro" d="M110 60 A90 90 0 0 1 200 150"/><line class="tr" x1="110" y1="60" x2="200" y2="40"/><circle class="tr" cx="110" cy="60" r="6"/><path class="tr" d="M120 170 C150 170 170 160 200 150"/><text class="cota-t" x="150" y="190">soft close</text></svg>`,
  mdf: `<svg viewBox="0 0 260 200"><path class="tr" d="M40 120 L130 80 L220 120 L130 160 Z"/><path class="tr" d="M40 104 L130 64 L220 104"/><path class="tr-ouro" d="M40 88 L130 48 L220 88 L130 128 Z"/><line class="tr" x1="40" y1="88" x2="40" y2="120"/><line class="tr" x1="220" y1="88" x2="220" y2="120"/><line class="tr" x1="130" y1="128" x2="130" y2="160"/><text class="cota-t" x="150" y="180">18 mm</text></svg>`,
};
$$('.pilar-ico').forEach((d) => { d.innerHTML = ICONES[d.dataset.ico]; });
$$('.pilar-ico svg').forEach((svg) => {
  const tracos = $$('rect, line, path, circle', svg);
  tracos.forEach((t) => {
    const L = t.getTotalLength?.() || 300;
    t.style.strokeDasharray = L;
    t.style.strokeDashoffset = L;
  });
  ScrollTrigger.create({
    trigger: svg, start: 'top 85%', once: true,
    onEnter: () => gsap.to(tracos, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.08 }),
  });
});

const mm = gsap.matchMedia();
mm.add('all', () => {
  const trilho = $('.pilares-trilho');
  const dist = () => trilho.scrollWidth - window.innerWidth;
  gsap.to(trilho, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.pilares', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
  });
});

// ---------- ambientes ----------
const gavetas = montarGavetas($('#gaveteiro'));
ScrollTrigger.create({ trigger: '#gaveteiro', start: 'top 70%', once: true, onEnter: () => setTimeout(() => gavetas.abrirPrimeira(), 250) });
gsap.from('.gaveta', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '#gaveteiro', start: 'top 85%' } });

// ---------- mapa ----------
const mapa = montarMapa();
ScrollTrigger.create({ trigger: '#mapa', start: 'top 70%', once: true, onEnter: () => mapa.animar() });

// ---------- vidraçaria ----------
const palco = $('#vidro-palco');
const espelho = $('.vidro-espelho');
if (!toque) {
  palco.addEventListener('pointermove', (e) => {
    const r = palco.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    espelho.style.setProperty('--ry', `${x * 14}deg`);
    espelho.style.setProperty('--rx', `${-y * 10}deg`);
    espelho.style.setProperty('--tx', `${-x * 4}%`);
    espelho.style.setProperty('--ty', `${-y * 4}%`);
    espelho.style.setProperty('--bx', `${(x + 0.5) * 100}%`);
    espelho.style.setProperty('--by', `${(y + 0.5) * 100}%`);
  });
  palco.addEventListener('pointerleave', () => ['--ry', '--rx', '--tx', '--ty'].forEach((v) => espelho.style.setProperty(v, 0)));
} else {
  // celular: o espelho gira e o reflexo corre conforme a rolagem
  ScrollTrigger.create({
    trigger: '#vidracaria', start: 'top bottom', end: 'bottom top',
    onUpdate: (s) => {
      const x = s.progress - 0.5;
      espelho.style.setProperty('--ry', `${x * 26}deg`);
      espelho.style.setProperty('--tx', `${-x * 6}%`);
      espelho.style.setProperty('--bx', `${(1 - s.progress) * 100}%`);
      espelho.style.setProperty('--by', `${20 + s.progress * 50}%`);
    },
  });
}
if (toque) $('.ferr-dica').lastChild.textContent = 'deslize a gaveta para o lado';
gsap.fromTo(espelho, { clipPath: 'inset(50% 0 50% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '#vidracaria', start: 'top 65%' } });

// ---------- contato: gravação ----------
const grav = montarGravacao($('#gravacao-canvas'));
if (reduzido) grav.mostrarPronto();
else ScrollTrigger.create({ trigger: '.gravacao', start: 'top 80%', once: true, onEnter: () => grav.gravar() });

// ---------- revelações de texto ----------
$$('.titulo-sec, .titulo-contato, .acab-desc, .ferr-texto p, .obras-texto p, .vidro-texto p, .pilar-intro p').forEach((el) => {
  if (el.closest('.oficina')) return;
  gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
});

// ---------- topo e botão flutuante ----------
const topo = $('.topo');
const flut = $('.whats-flutuante');
ScrollTrigger.create({ start: 60, onUpdate: (s) => topo.classList.toggle('solido', s.scroll() > 60) });
ScrollTrigger.create({ trigger: '#acabamentos', start: 'top center', endTrigger: '#contato', end: 'top 80%', onToggle: (s) => flut.classList.toggle('on', s.isActive) });

// ---------- cursor de precisão ----------
if (!toque && !reduzido) {
  const mira = $('#mira'), coord = $('.mira-coord');
  document.body.classList.add('com-mira');
  let mx = -100, my = -100, cx = -100, cy = -100;
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    mira.classList.add('on');
    mira.classList.toggle('sobre', !!e.target.closest('a, button, .gav-foto, .mapa-ponto, #ferr-canvas'));
  }, { passive: true });
  document.addEventListener('pointerleave', () => mira.classList.remove('on'));
  gsap.ticker.add(() => {
    cx += (mx - cx) * 0.35; cy += (my - cy) * 0.35;
    mira.style.transform = `translate(${cx}px, ${cy}px)`;
    coord.textContent = `x ${String(Math.round(cx)).padStart(4, '0')}  y ${String(Math.round(cy)).padStart(4, '0')}`;
  });
}

// recalcula posições quando as fotos carregam
window.addEventListener('load', () => ScrollTrigger.refresh());
