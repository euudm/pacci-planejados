// Gera os pixels das texturas fora da thread principal (não trava a rolagem).
import { pixelsSelecao } from './texturas.js';

self.onmessage = ({ data: { id, W, H } }) => {
  const px = pixelsSelecao(id, W, H);
  const transf = [px.cor.buffer];
  if (px.rough) transf.push(px.rough.buffer);
  self.postMessage({ id, ...px }, transf);
};
