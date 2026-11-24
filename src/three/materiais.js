// Materiais PBR das seleções de acabamento (texturas vêm de texturas.js).
import * as THREE from 'three';
import { SELECOES, texturaSelecao, texturaPedra } from './texturas.js';

export { SELECOES };

const cache = new Map();

export function materialSelecao(id, renderer, leve = false) {
  if (cache.has(id)) return cache.get(id);
  const sel = SELECOES.find((s) => s.id === id);
  const tx = texturaSelecao(id, leve ? 256 : 512, leve ? 512 : 1024);
  const map = new THREE.CanvasTexture(tx.cor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  let roughnessMap = null;
  if (tx.rough) {
    roughnessMap = new THREE.CanvasTexture(tx.rough);
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  }
  const mat = new THREE.MeshPhysicalMaterial({
    map, roughnessMap, roughness: sel.rough, metalness: 0,
    clearcoat: sel.coat, clearcoatRoughness: 0.35,
  });
  cache.set(id, mat);
  return mat;
}

let pedra = null;
export function materialPedra() {
  if (pedra) return pedra;
  const map = new THREE.CanvasTexture(texturaPedra());
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  pedra = new THREE.MeshPhysicalMaterial({ map, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  return pedra;
}

export const materialMetal = () =>
  new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: 1, roughness: 0.32 });

export const materialRodape = () =>
  new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.7 });

// UV em coordenadas de mundo: o veio continua entre peças vizinhas
export function uvMundo(geo, offset, escala = 1 / 1.2) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset.x, y = pos.getY(i) + offset.y, z = pos.getZ(i) + offset.z;
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = z; v = y; }
    else if (ay >= az) { u = x; v = z; }
    else { u = x; v = y; }
    uv.setXY(i, u * escala, v * escala * 0.5);
  }
  uv.needsUpdate = true;
}
