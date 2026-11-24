// Ambientes como gavetas: cada categoria é uma frente de MDF que abre e mostra as obras.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// altura da página mudou: recalcula as seções presas (no celular o resize é ignorado)
const recalcular = () => ScrollTrigger.refresh();
import obras from '../data/obras.json';
import { texturaComoURL } from '../three/texturas.js';
import { abrirLightbox } from './lightbox.js';

export const AMBIENTES = [
  { cat: 'cozinhas', nome: 'Cozinhas', tag: 'Ergonomia · Funcionalidade · Praticidade · Beleza', acab: 'freijo' },
  { cat: 'homes', nome: 'Homes de TV', tag: 'Elegância · Multifuncionalidade · Destaque', acab: 'beige' },
  { cat: 'quartos', nome: 'Quartos', tag: 'Organização · Privacidade · Aconchego', acab: 'moss' },
  { cat: 'banheiros', nome: 'Banheiros', tag: 'Praticidade · Criatividade · Limpeza · Ordem', acab: 'cristallo' },
  { cat: 'comerciais', nome: 'Comerciais', tag: 'Marca · Identidade · Suporte · Função', acab: 'malva' },
  { cat: 'studios', nome: 'Studios', tag: 'Otimização · Praticidade · Personalidade', acab: 'freijo' },
];

export const legendaDe = (o) =>
  o.selecao ? `Seleção ${o.selecao}` : o.bairro ? o.bairro : '';

export function montarGavetas(raiz) {
  const texturas = {};
  const abertas = new Set();

  AMBIENTES.forEach((amb, i) => {
    const fotos = obras.filter((o) => o.cat === amb.cat);
    const itensLb = fotos.map((o) => ({ id: o.id, legenda: `${amb.nome}  ·  ${legendaDe(o)}`, alt: `${amb.nome}: ${legendaDe(o) || 'projeto Pacci'}` }));
    const g = document.createElement('article');
    g.className = 'gaveta';
    g.dataset.acab = amb.acab;
    g.innerHTML = `
      <button class="gav-frente" aria-expanded="false" aria-controls="gav-${amb.cat}">
        <span class="gav-veio"></span>
        <span class="gav-num mono">${String(i + 1).padStart(2, '0')}</span>
        <span class="gav-nome">${amb.nome}</span>
        <span class="gav-tag">${amb.tag}</span>
        <span class="gav-qtd mono">${fotos.length} fotos</span>
        <span class="gav-puxador" aria-hidden="true"></span>
      </button>
      <div class="gav-corpo" id="gav-${amb.cat}" role="region" aria-label="${amb.nome}">
        <div class="gav-bandeja">
          ${fotos.map((o, k) => `
            <figure class="gav-foto" style="--r:${o.r}" data-k="${k}">
              <img src="/obras/${o.id}-800.webp" alt="${itensLb[k].alt}" loading="lazy" decoding="async" width="${Math.round(800)}" height="${Math.round(800 / o.r)}" />
              ${legendaDe(o) ? `<figcaption class="mono">${legendaDe(o)}</figcaption>` : ''}
            </figure>`).join('')}
        </div>
        <div class="gav-dica mono">arraste para o lado</div>
      </div>`;
    raiz.appendChild(g);

    const frente = g.querySelector('.gav-frente');
    const corpo = g.querySelector('.gav-corpo');
    const bandeja = g.querySelector('.gav-bandeja');

    // veio da madeira gerado na hora em que a gaveta aparece
    const veio = g.querySelector('.gav-veio');
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      texturas[amb.acab] ||= texturaComoURL(amb.acab, 192, 384);
      veio.style.backgroundImage = `url(${texturas[amb.acab]})`;
      io.disconnect();
    }, { rootMargin: '400px' });
    io.observe(g);

    function abrir(sim) {
      frente.setAttribute('aria-expanded', String(sim));
      g.classList.toggle('aberta', sim);
      if (sim) {
        abertas.add(g);
        gsap.fromTo(corpo, { height: 0 }, { height: 'auto', duration: 0.9, ease: 'expo.out', onComplete: recalcular });
        gsap.fromTo(bandeja.children, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.035 });
        gsap.fromTo(frente, { y: 0 }, { y: -6, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' });
      } else {
        abertas.delete(g);
        // fechamento suave: rápido no começo, devagar no fim
        gsap.to(corpo, { height: 0, duration: 0.75, ease: 'expo.out', onComplete: recalcular });
      }
    }
    frente.addEventListener('click', () => {
      const vaiAbrir = !g.classList.contains('aberta');
      abertas.forEach((outra) => outra !== g && outra._fechar());
      abrir(vaiAbrir);
    });
    g._fechar = () => abrir(false);
    g._abrir = () => abrir(true);

    // arrastar a bandeja no desktop
    let arr = null, moveu = false;
    bandeja.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      arr = { x: e.clientX, s: bandeja.scrollLeft };
      moveu = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!arr) return;
      const dx = e.clientX - arr.x;
      if (Math.abs(dx) > 4) moveu = true;
      bandeja.scrollLeft = arr.s - dx;
    });
    window.addEventListener('pointerup', () => { arr = null; });
    bandeja.addEventListener('click', (e) => {
      const fig = e.target.closest('.gav-foto');
      if (!fig || moveu) return;
      abrirLightbox(itensLb, Number(fig.dataset.k));
    });
    bandeja.addEventListener('dragstart', (e) => e.preventDefault());
  });

  return {
    abrirPrimeira() {
      const g = raiz.querySelector('.gaveta');
      if (g && !g.classList.contains('aberta')) g._abrir();
    },
  };
}
