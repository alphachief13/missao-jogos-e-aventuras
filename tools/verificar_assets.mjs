// Confere se todos os arquivos que o jogo usa existem e têm o tamanho esperado.
// Uso: node tools/verificar_assets.mjs   (sai com código 1 se faltar algo)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FASES } from '../server/fases.js';

const A = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const PERS = ['ruivo', 'loira', 'cacheado', 'sapo'];
const ANIMS = { idle: 2, corrida: 4, pulo: 1, queda: 1, empurrar: 1, derrota: 1, vitoria: 1, aceno: 1 };
const CORES = ['azul', 'rosa', 'amarelo', 'verde'];
const SONS = ['pulo', 'pouso', 'bandeira', 'peca', 'alavanca', 'botao', 'chegada', 'perdeu_coracao', 'derrota', 'vitoria',
              'clique', 'trocar', 'entrou', 'contagem', 'compra'];
const MUNDOS = [...new Set(FASES.map(f => f.mundo))];

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
console.log(faltas ? `\n${faltas} problema(s).` : `✓ ${exigidos.length} arquivos conferidos, nada faltando.`);
process.exit(faltas ? 1 : 0);
