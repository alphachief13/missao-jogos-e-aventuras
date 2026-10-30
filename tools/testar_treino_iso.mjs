// Robô do treino do mapa 3D: joga o treino isométrico com 2, 3 e 4 times (e sozinho com 2) e confere
// que os objetivos avançam em ordem até a vitória. Uso: node tools/testar_treino_iso.mjs
import { JogoIso } from '../public/jogo/sim_iso.js';
import { FASE_TREINO_ISO, PASSOS_TREINO_ISO } from '../public/jogo/treino.js';

const COMBOS = [
  ['ruivo', 'loira', 'cacheado', 'sapo'],
  ['ruivo', 'loira'],
  ['cacheado', 'sapo'],
  ['ruivo', 'sapo'],
  ['loira', 'cacheado', 'sapo'],
];
const DT = 1 / 60;
const AGUA = -0.6, PAREDE = 99;
const joy = (ix, iz) => ({ jx: (ix - iz) / Math.SQRT2, jy: (ix + iz) / Math.SQRT2 });

class Robo {
  constructor(ativos, pessoas = ativos.length) {
    this.j = new JogoIso(FASE_TREINO_ISO, {}, ativos, pessoas);
    this.f = 0;
    this.passo = 0;
    this.podeCair = false;
  }
  P(id) { return this.j.personagens.find(p => p.id === id); }
  tick(ents = {}) {
    this.j.passo(DT, ents);
    this.f++;
    for (const ev of this.j.eventos)
      if (ev.e === 'caiu' && !this.podeCair) throw new Error(`${ev.id} caiu na água em x=${ev.x.toFixed(1)} z=${ev.z.toFixed(1)}`);
    for (const c of Object.values(this.j.coracoes)) c.n = c.max; // como na sala, no treino
    while (this.passo < PASSOS_TREINO_ISO.length && PASSOS_TREINO_ISO[this.passo].feito(this.j, this.j.eventos)) this.passo++;
    if (this.f > 60 * 600) throw new Error('tempo esgotado');
  }
  espera(n, ents = {}) { for (let k = 0; k < n; k++) this.tick(ents); }
  ate(cond, ents = () => ({}), max = 1200, msg = 'condição nunca aconteceu') {
    for (let k = 0; k < max; k++) { if (cond()) { this.espera(5); return; } this.tick(ents()); }
    throw new Error(msg);
  }
  // busca em largura no grid (mesma regra de altura do jogo: pula até 1,3)
  caminho(p, c1, l1) {
    const j = this.j;
    const c0 = Math.floor(p.x), l0 = Math.floor(p.z);
    const chave = (c, l) => l * j.C + c;
    const veio = new Map([[chave(c0, l0), null]]);
    const fila = [[c0, l0]];
    const pula = !p.carregando;
    while (fila.length) {
      const [c, l] = fila.shift();
      if (c === c1 && l === l1) break;
      const h = j.topo(c, l, p);
      for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = [c + dc, l + dl], k = chave(...n);
        if (veio.has(k)) continue;
        const t = j.topo(n[0], n[1], p);
        if (t >= PAREDE || t <= AGUA || t > h + (pula ? 1.3 : 0.3)) continue;
        veio.set(k, [c, l]);
        fila.push(n);
      }
    }
    if (!veio.has(chave(c1, l1))) throw new Error(`${p.id} sem caminho até (${c1},${l1})`);
    const passos = [];
    for (let n = [c1, l1]; n && !(n[0] === c0 && n[1] === l0); n = veio.get(chave(...n))) passos.unshift(n);
    return passos;
  }
  vai(id, x, z, fixos = {}) {
    const p = this.P(id);
    let passos;
    for (let k = 0; ; k++) {
      try { passos = this.caminho(p, Math.floor(x), Math.floor(z)).map(([c, l]) => [c + 0.5, l + 0.5]); break; }
      catch (e) { if (k > 120) throw e; this.tick(fixos); }
    }
    passos.push([x, z]);
    for (const [tx, tz] of passos) {
      const alvoH = this.j.topo(Math.floor(tx), Math.floor(tz), p);
      for (let k = 0; k < 240; k++) {
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.12 && p.noChao) break;
        const subir = alvoH > p.y + 0.3 && d < 1.0 && p.noChao;
        this.tick({ ...fixos, [id]: { ...joy(dx / Math.max(d, 0.3), dz / Math.max(d, 0.3)), pulo: subir || !p.noChao, puloBorda: subir } });
        if (k === 239) throw new Error(`${id} travou indo para (${tx},${tz}) em (${p.x.toFixed(2)},${p.z.toFixed(2)})`);
      }
    }
    this.espera(10, fixos);
  }
  acao(id, fixos = {}) { this.tick({ ...fixos, [id]: { acao: true, acaoBorda: true } }); this.espera(3, fixos); }
  olha(id, ix, iz) { this.tick({ [id]: joy(ix, iz) }); this.espera(8); }
}

function treino(r, ids) {
  const j = r.j;
  const [a, b] = ids;
  r.vai(a, 3.5, 10.5);                                            // 1 andar
  for (const id of ids) {                                         // 2 bandeirinha no bloco alto
    const g = j.gemas.find(o => o.cor === j.personagens.find(p => p.id === id).cor);
    r.vai(id, g.x, g.z);
  }
  for (const id of ids) r.vai(id, 12.5, 9.5 + ids.indexOf(id) * 0.6); // 3 faixa da cor
  r.vai(a, 11.5, 11.0); r.acao(a);                                // 4 pegar o bloco
  if (!r.P(a).carregando) throw new Error('não pegou o bloco');
  r.vai(a, 14.5, 9.5); r.olha(a, 1, -1); r.acao(a); r.espera(50); // 5 encaixe
  if (!j.encaixes.encaixe.cheio) throw new Error('bloco não encaixou');
  r.vai(a, 12.5, 4.5);                                            // 6 cair na lagoa
  r.podeCair = true;
  r.ate(() => r.P(a).caido, () => ({ [a]: joy(1, 0) }), 120, 'não caiu na lagoa');
  r.podeCair = false;
  const pa = r.P(a);
  r.vai(b, pa.x - 0.7, pa.z); r.acao(b);                          // 7 ajudar
  if (pa.caido) throw new Error('não levantou com ajuda');
  ids.forEach((id, i) => r.vai(id, 11.5, 1.5 + i * 0.9));         // 8 obra em equipe
  const todos = () => Object.fromEntries(ids.map(id => [id, { acao: true }]));
  r.ate(() => j.obras.ponte.pronta, todos, 600, 'ponte não ficou pronta');
  r.espera(60);
  ids.forEach((id, i) => r.vai(id, 2.5 + (i % 2), 2.5 + Math.floor(i / 2))); // 9 todos no troféu
  r.espera(200);
  return j.resultado;
}

let falhas = 0;
for (const [ids, pessoas] of [...COMBOS.map(c => [c, c.length]), [['ruivo', 'loira'], 1]]) {
  const r = new Robo(ids, pessoas);
  let res;
  try { res = treino(r, ids); } catch (e) { res = 'ERRO: ' + e.message; }
  if (res === 'vitoria' && r.passo < PASSOS_TREINO_ISO.length) res = `objetivos parados no passo ${r.passo + 1}: ${PASSOS_TREINO_ISO[r.passo].texto}`;
  const ok = res === 'vitoria';
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} Treino 3D [${ids.join(',')}${pessoas === 1 ? ', sozinho' : ''}] ${res}  t=${r.j.tempo.toFixed(0)}s`);
}
process.exit(falhas ? 1 : 0);
