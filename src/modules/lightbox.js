// Lightbox simples com navegação por teclado e swipe
const el = document.getElementById('lightbox');
const img = el.querySelector('img');
const leg = el.querySelector('.lb-leg');
let lista = [], idx = 0, origemFoco = null;

const src = (id) => `/obras/${id}-1600.webp`;

function mostrar() {
  const it = lista[idx];
  img.src = src(it.id);
  img.alt = it.alt || '';
  leg.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(lista.length).padStart(2, '0')}   ${it.legenda || ''}`;
}

export function abrirLightbox(itens, i = 0) {
  lista = itens; idx = i;
  origemFoco = document.activeElement;
  mostrar();
  el.classList.add('aberto');
  el.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('travado');
  el.querySelector('.lb-fechar').focus();
}

function fechar() {
  el.classList.remove('aberto');
  el.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('travado');
  origemFoco?.focus?.();
}
const nav = (d) => { idx = (idx + d + lista.length) % lista.length; mostrar(); };

el.querySelector('.lb-fechar').addEventListener('click', fechar);
el.querySelector('.lb-ant').addEventListener('click', () => nav(-1));
el.querySelector('.lb-prox').addEventListener('click', () => nav(1));
el.addEventListener('click', (e) => { if (e.target === el) fechar(); });
window.addEventListener('keydown', (e) => {
  if (!el.classList.contains('aberto')) return;
  if (e.key === 'Escape') fechar();
  if (e.key === 'ArrowRight') nav(1);
  if (e.key === 'ArrowLeft') nav(-1);
});
let x0 = null;
el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
el.addEventListener('touchend', (e) => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 50) nav(dx < 0 ? 1 : -1);
  x0 = null;
});
