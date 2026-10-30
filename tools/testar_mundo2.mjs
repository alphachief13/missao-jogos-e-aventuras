// Robô do Mundo 2 (isométrico): anda pelo mapa procurando caminho no grid e cumpre as 5 missões
// com 2, 3 e 4 times; também confere o resgate de um colega caído. Uso: node tools/testar_mundo2.mjs
import { JogoIso } from '../public/jogo/sim_iso.js';
import { COR_DO_PERSONAGEM } from '../public/jogo/sim.js';
import { FASES_MUNDO2 } from '../public/jogo/fases_mundo2.js';

const COMBOS = [
  ['ruivo', 'loira', 'cacheado', 'sapo'],
  ['ruivo', 'loira'],
  ['cacheado', 'sapo'],
  ['ruivo', 'sapo'],
  ['loira', 'cacheado', 'sapo'],
];
const DT = 1 / 60;
const AGUA = -0.6, PAREDE = 99;

// direção no mundo (x, z) → joystick em coordenadas de tela
const joy = (ix, iz) => ({ jx: (ix - iz) / Math.SQRT2, jy: (ix + iz) / Math.SQRT2 });

class Robo {
  constructor(fase, ativos, pessoas = ativos.length) {
    this.j = new JogoIso(fase, {}, ativos, pessoas);
    this.ativos = ativos;
    this.f = 0;
    this.log = [];
  }
  P(id) { return this.j.personagens.find(p => p.id === id); }
  tick(ents = {}) {
    this.j.passo(DT, ents);
    this.f++;
    for (const ev of this.j.eventos) {
      if (ev.e === 'caiu' && !this.podeCair) throw new Error(`${ev.id} caiu na água em x=${ev.x.toFixed(1)} z=${ev.z.toFixed(1)}`);
      if (['missao', 'construir', 'encaixe', 'caiu', 'ajudou'].includes(ev.e)) this.log.push(`${ev.e}:${ev.id}`);
    }
    if (this.f > 60 * 900) throw new Error('tempo esgotado');
  }
  espera(n, ents = {}) { for (let k = 0; k < n; k++) this.tick(ents); }
  ate(cond, ents = () => ({}), max = 1200, msg = 'condição nunca aconteceu') {
    for (let k = 0; k < max; k++) { if (cond()) { this.espera(5); return; } this.tick(ents()); }
    throw new Error(msg);
  }

  // Caminho no grid (BFS) do tile atual até o tile de destino; sobe degraus de até 1,3 pulando.
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

  // Leva o personagem até (x, z) e devolve o controle; outros personagens podem ficar segurando entradas (fixos).
  vai(id, x, z, fixos = {}) {
    const p = this.P(id);
    // portões e elevadores levam um tempinho para abrir: espera até 2 s por um caminho
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
        const e = { ...joy(dx / Math.max(d, 0.3), dz / Math.max(d, 0.3)), pulo: subir || !p.noChao, puloBorda: subir };
        this.tick({ ...fixos, [id]: e });
        if (k === 239) throw new Error(`${id} travou indo para (${tx},${tz}) em (${p.x.toFixed(2)},${p.z.toFixed(2)}) y=${p.y.toFixed(2)}`);
      }
    }
    this.espera(10, fixos);
  }
  acao(id, fixos = {}) { this.tick({ ...fixos, [id]: { acao: true, acaoBorda: true } }); this.espera(3, fixos); }
  olha(id, ix, iz, fixos = {}) { this.tick({ ...fixos, [id]: joy(ix, iz) }); this.espera(8, fixos); }
  feita(m) { return this.j.missoes.find(o => o.id === m).feita; }
}

function missoes(r, ids) {
  const j = r.j;
  const [a, b] = ids;
  const quem = cor => ids.find(i => COR_DO_PERSONAGEM[i] === cor) || a;

  // 1 · A ponte do rio: dois seguram AÇÃO na obra
  r.vai(a, 5.5, 10.6); r.vai(b, 6.5, 10.6);
  r.ate(() => j.obras.ponte.pronta, () => ({ [a]: { acao: true }, [b]: { acao: true } }), 600, 'ponte não ficou pronta');
  r.vai(a, 5.5, 2.5);
  if (!r.feita('m1')) throw new Error('missão 1 não concluída');

  // 2 · A caixa pesada: dois empurram para o norte até a placa
  r.vai(a, 27.5, 14.6); r.vai(b, 27.5, 14.6);
  const norte = joy(0, -1);
  r.ate(() => j.caixas[0].l === 10 && !j.caixas[0].de, () => ({ [a]: norte, [b]: norte }), 900, 'caixa não chegou na placa');
  r.vai(a, 30.5, 3.5);
  if (!r.feita('m2')) throw new Error('missão 2 não concluída');

  // 3 · Caminho das cores: cada time puxa a sua alavanca (a dos ausentes fica livre)
  for (const cor of ['azul', 'rosa', 'amarelo', 'verde']) {
    const al = j.alavancas[`al_${cor}`];
    const id = quem(cor);
    r.vai(id, al.x, al.z + 0.8); r.acao(id);
    r.vai(id, al.x, 26.5);
  }
  r.vai(a, 11.5, 20.5);
  if (!r.feita('m3')) throw new Error('missão 3 não concluída');

  // 4 · O elevador: a pega o bloco e sobe no elevador; b segura a placa; a joga o bloco no encaixe
  r.vai(a, 26.5, 26.9); r.acao(a);
  if (!j.personagens.find(p => p.id === a).carregando) throw new Error('não pegou o bloco');
  r.vai(a, 31.5, 24.5);
  r.vai(b, 24.5, 26.5, { [a]: {} });
  const elev = j.plataformas.find(p => p.id === 'elevador');
  r.ate(() => elev.h >= 2);
  r.vai(a, 33.5, 22.4);
  r.olha(a, 0, -1); r.acao(a); r.espera(40);
  if (!j.encaixes.encaixe4.cheio) throw new Error('bloco não encaixou');
  r.vai(b, 25.5, 20.5);
  if (!r.feita('m4')) throw new Error('missão 4 não concluída');

  // 5 · A grande torre: todos seguram AÇÃO na obra da escada e sobem juntos
  ids.forEach((id, i) => r.vai(id, 16.5 + i, 8.6));
  const todos = () => Object.fromEntries(ids.map(id => [id, { acao: true }]));
  r.ate(() => j.obras.escada.pronta, todos, 600, 'escada não ficou pronta');
  r.espera(150);
  ids.forEach((id, i) => r.vai(id, 16.5 + i, 3.5));
  r.espera(200);
  return j.resultado;
}

// Resgate: um personagem cai no lago, o outro chega perto e aperta AÇÃO.
function resgate(fase) {
  const r = new Robo(fase, ['ruivo', 'loira']);
  r.podeCair = true;
  r.vai('ruivo', 18.5, 13.5);
  r.ate(() => r.P('ruivo').caido, () => ({ ruivo: joy(1, 0) }), 120, 'não caiu no lago');
  const p = r.P('ruivo');
  r.vai('loira', p.x - 0.8, p.z);
  r.acao('loira');
  if (p.caido) throw new Error('não levantou com ajuda');
  if (r.j.coracoes.azul.n !== r.j.coracoes.azul.max) throw new Error('perdeu coração mesmo com ajuda');
  // sem ajuda: levanta sozinho e perde um coração
  r.ate(() => r.P('ruivo').caido, () => ({ ruivo: joy(1, 0) }), 200, 'não caiu de novo');
  r.espera(60 * 7.5);
  if (r.P('ruivo').caido || r.j.coracoes.azul.n !== r.j.coracoes.azul.max - 1) throw new Error('não levantou sozinho perdendo 1 coração');
  return 'ok';
}

// Cooperação obrigatória: com 2 pessoas, um time sozinho não monta a ponte nem empurra a caixa pesada.
function exigeDupla(fase) {
  const r = new Robo(fase, ['ruivo', 'loira']);
  r.vai('ruivo', 5.5, 10.6);
  r.espera(60 * 6, { ruivo: { acao: true } });
  if (r.j.obras.ponte.pronta) throw new Error('ponte montada por um time só');
  r.vai('ruivo', 27.5, 14.6);
  r.espera(60 * 3, { ruivo: joy(0, -1) });
  if (r.j.caixas[0].l !== 13) throw new Error('caixa pesada andou com um time só');
  return 'ok';
}

let falhas = 0;
for (const fase of FASES_MUNDO2) {
  for (const ids of COMBOS) {
    const r = new Robo(fase, ids);
    let res;
    try { res = missoes(r, ids); } catch (e) { res = 'ERRO: ' + e.message; }
    const ok = res === 'vitoria';
    if (!ok) falhas++;
    console.log(`${ok ? '✓' : '✗'} ${fase.id} [${ids.join(',')}] ${res}  t=${r.j.tempo.toFixed(0)}s pecas=${r.j.pecas}`);
  }
  // sozinho com 2 personagens: obras e caixa pedem só 1 ajudante
  {
    const r = new Robo(fase, ['ruivo', 'loira'], 1);
    let res;
    try { res = missoes(r, ['ruivo', 'loira']); } catch (e) { res = 'ERRO: ' + e.message; }
    if (res !== 'vitoria') falhas++;
    console.log(`${res === 'vitoria' ? '✓' : '✗'} ${fase.id} [sozinho com 2] ${res}`);
  }
  for (const [nome, teste] of [['cooperação obrigatória', exigeDupla], ['resgate de colega caído', resgate]]) {
    let res;
    try { res = teste(fase); } catch (e) { res = 'ERRO: ' + e.message; }
    if (res !== 'ok') falhas++;
    console.log(`${res === 'ok' ? '✓' : '✗'} ${fase.id} ${nome} ${res}`);
  }
}
process.exit(falhas ? 1 : 0);
