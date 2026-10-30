// Confere se todos os arquivos que o jogo usa existem e têm o tamanho esperado.
// Uso: node tools/verificar_assets.mjs   (sai com código 1 se faltar algo)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FASES } from '../public/jogo/fases.js';

const A = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const PERS = ['ruivo', 'loira', 'cacheado', 'sapo'];
const ANIMS = { idle: 2, corrida: 4, pulo: 1, queda: 1, empurrar: 1, derrota: 1, vitoria: 1, aceno: 1 };
const CORES = ['azul', 'rosa', 'amarelo', 'verde'];
const SONS = ['pulo', 'pouso', 'bandeira', 'peca', 'alavanca', 'botao', 'chegada', 'perdeu_coracao', 'derrota', 'vitoria',
              'clique', 'trocar', 'entrou', 'contagem', 'compra'];
// Fundo pintado obrigatório só o dos Exploradores; os outros mundos usam ele tingido até ganharem o seu (CODEX_MUNDOS.md).
const MUNDOS = ['exploradores'];
const OUTROS_MUNDOS = [...new Set(FASES.map(f => f.mundo))].filter(m => !MUNDOS.includes(m));

const exigidos = [
  ['kit/logo.png'], ['kit/logo_roboeduc.png'], ...[1, 2, 3, 4, 5].map(i => [`kit/selo_${i}.png`]),
  ...['bloco', 'engrenagem', 'trofeu', 'medalha', 'bussola'].map(n => [`ui/ic_${n}.png`]),
  ...CORES.map(c => [`ui/bandeira_${c}.png`]),
  ...PERS.flatMap(p => [
    ...Object.entries(ANIMS).map(([a, n]) => [`personagens/${p}/${a}.png`, 384 * n, 384]),
    [`personagens/${p}/arte.png`], [`personagens/${p}/retrato.png`, 256, 256],
  ]),
  ...MUNDOS.flatMap(m => [[`fundos/${m}/longe.png`, 2400, 1080], [`fundos/${m}/meio.png`, 2400, 1080]]),
  ['fundos/lobby/longe.png', 2400, 1080],
  ...['brilho_branco', 'estrelinha', 'poeira', 'faisca', ...CORES.flatMap(c => [`brilho_${c}`, `bloquinho_${c}`])].map(n => [`particulas/${n}.png`]),
  ...SONS.map(s => [`sons/${s}.wav`]),
];

// Tamanho de PNG direto do cabeçalho (sem dependências).
function tamanhoPng(arq) {
  const b = fs.readFileSync(arq);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

let faltas = 0;
for (const [rel, w, h] of exigidos) {
  const arq = path.join(A, rel);
  if (!fs.existsSync(arq)) { console.log(`✗ falta      ${rel}`); faltas++; continue; }
  if (w && rel.endsWith('.png')) {
    const [lw, lh] = tamanhoPng(arq);
    if (lw !== w || lh !== h) { console.log(`✗ tamanho    ${rel}: ${lw}×${lh} (esperado ${w}×${h})`); faltas++; }
  }
}
// Mundo 2: sprites isométricos, enfeites e sons novos são opcionais (o jogo usa substitutos enquanto faltam),
// mas quando existem precisam ter o tamanho certo.
const ISO = { frente_idle: 2, costas_idle: 2, frente_corrida: 4, costas_corrida: 4, frente_pulo: 1, costas_pulo: 1,
              frente_queda: 1, costas_queda: 1, frente_carregar: 4, costas_carregar: 4, frente_empurrar: 2, costas_empurrar: 2,
              ajudar: 2, caido: 1 };
const ENFEITES = { arvore_1: [512, 768], arvore_2: [512, 768], arbusto: [384, 256], flores: [256, 192], pedra: [256, 192],
                   cerca: [512, 256], placa: [256, 320], pilha_blocos: [384, 384], guindaste: [768, 1024], cone: [192, 256], carrinho: [384, 320] };
const opcionais = [
  ...PERS.flatMap(p => Object.entries(ISO).map(([a, n]) => [`personagens/${p}/iso/${a}.png`, 384 * n, 384])),
  ...Object.entries(ENFEITES).map(([e, [w, h]]) => [`mundo2/enfeites/${e}.png`, w, h]),
  ...['pegar', 'soltar', 'empurrar', 'construir', 'ajudar', 'caiu', 'missao', 'placa'].map(s => [`sons/${s}.wav`]),
  ...OUTROS_MUNDOS.flatMap(m => [[`fundos/${m}/longe.png`, 2400, 1080], [`fundos/${m}/meio.png`, 2400, 1080]]),
];
let pendentes = 0;
for (const [rel, w, h] of opcionais) {
  const arq = path.join(A, rel);
  if (!fs.existsSync(arq)) { pendentes++; continue; }
  if (w && rel.endsWith('.png')) {
    const [lw, lh] = tamanhoPng(arq);
    if (lw !== w || lh !== h) { console.log(`✗ tamanho    ${rel}: ${lw}×${lh} (esperado ${w}×${h})`); faltas++; }
  }
}
console.log(`· opcionais (sprites 3D, enfeites, sons e fundos dos mundos 2-5): ${opcionais.length - pendentes}/${opcionais.length} prontos` + (pendentes ? ' (o jogo usa substitutos para os que faltam)' : ''));
console.log(faltas ? `\n${faltas} problema(s).` : `✓ ${exigidos.length} arquivos conferidos, nada faltando.`);
process.exit(faltas ? 1 : 0);
