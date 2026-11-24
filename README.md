# Pacci Planejados

Site one-page para uma marcenaria de móveis planejados em São Paulo. O conceito é **"Feito peça por peça"**: em vez de mostrar o móvel pronto, o visitante acompanha a fabricação dele.

## Problema

O material da empresa era um PDF de 47 páginas com cerca de 200 fotos de obra. O diferencial deles (corte em fábrica, MDF 100%, ferragens de primeira linha) aparecia só como texto, igual ao de qualquer concorrente.

## Solução

Cada argumento de venda virou uma interação:

| Argumento | Como aparece no site |
| --- | --- |
| Corte em fábrica | Cena 3D guiada pelo scroll: uma pilha de chapas de MDF é cortada por um pórtico CNC com laser e faíscas, as peças sobem e se encaixam numa cozinha completa |
| Variedade de padrões de MDF | Configurador: as 5 seleções do catálogo trocam o acabamento do móvel 3D com uma varredura de luz, e mostram as fotos reais daquela seleção |
| Ferragens Blum, Häfele, Hettich | Gaveta 3D que se arrasta com o mouse ou o dedo; ao soltar, ela fecha com física de amortecimento e um gráfico mostra a velocidade caindo |
| Portfólio | Ambientes como gavetas de MDF que abrem e mostram 122 fotos reais, extraídas e otimizadas do PDF |
| Atuação na região | Mapa com os 16 bairros onde há obra, com projeção que abre o centro de SP para caber |

## Stack

- Vite, JavaScript puro (sem framework)
- Three.js: geometria procedural, materiais PBR, RectAreaLight, sombras, partículas
- GSAP + ScrollTrigger e Lenis para scroll
- Texturas de madeira e pedra geradas em canvas (nenhuma imagem de textura baixada)
- Python (PyMuPDF + Pillow) para extrair, filtrar e converter as fotos do PDF para WebP

## Decisões técnicas

- **Empacotamento das chapas:** as peças do móvel são distribuídas em chapas de 2750 x 1850 mm com um algoritmo de prateleira, então a pilha inicial mostra um plano de corte plausível.
- **UV em coordenadas de mundo:** o veio da madeira continua entre peças vizinhas depois de montadas.
- **Three.js carregado sob demanda:** o pacote inicial tem cerca de 61 KB gzip; o 3D chega por import dinâmico enquanto o loader roda.
- **Celular:** sem scroll suave, câmera recalculada para tela vertical, resolução e sombras reduzidas. Sem WebGL (ou com `?lite=1`), o site cai para fotos e todo o conteúdo continua acessível.

## Como rodar

```bash
npm install
npm run dev     # http://localhost:5201
npm run build   # gera dist/
```

## Estrutura

```
src/
  main.js              orquestração (loader, scroll, seções)
  three/oficina.js     cena da montagem e configurador
  three/ferragem.js    gaveta com fechamento suave
  three/texturas.js    texturas procedurais das seleções
  modules/             gavetas, mapa, lightbox, gravação do logo
  data/obras.json      fotos catalogadas por ambiente, seleção e bairro
public/obras/          fotos em WebP (800 e 1600 px)
```
