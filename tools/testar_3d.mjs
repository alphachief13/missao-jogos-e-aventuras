// Robô das fases 3D (isométricas, a 11ª de cada mundo): anda pelo mapa procurando caminho no grid e cumpre as missões
// com 2, 3 e 4 times (e sozinho com 2); no Mundo 2 também confere o resgate de um colega caído e a cooperação.
// Uso: node tools/testar_3d.mjs [id-da-fase]
import { JogoIso } from '../public/jogo/sim_iso.js';
import { COR_DO_PERSONAGEM } from '../public/jogo/sim.js';
import { FASES_3D } from '../public/jogo/fases_3d.js';

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

function canteiro(r, ids) {
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

// ---------- ajudas comuns ----------
function ajuda(r, ids) {
  const j = r.j, [a, b] = ids;
  return {
    j, a, b,
    quem: cor => ids.find(i => COR_DO_PERSONAGEM[i] === cor) || a,
    feita(m) { if (!r.feita(m)) throw new Error(`missão ${m} não concluída`); },
    obraEmDupla(id, [x1, z1], [x2, z2]) {
      r.vai(a, x1, z1); r.vai(b, x2, z2);
      r.ate(() => j.obras[id].pronta, () => ({ [a]: { acao: true }, [b]: { acao: true } }), 600, `obra ${id} não ficou pronta`);
    },
    empurrar(x, z, dx, dz, pronto) {
      r.vai(a, x, z); r.vai(b, x, z);
      const e = joy(dx, dz);
      r.ate(pronto, () => ({ [a]: e, [b]: e }), 900, 'caixa não chegou na placa');
    },
    alavancas() {
      for (const cor of ['azul', 'rosa', 'amarelo', 'verde']) {
        const al = j.alavancas[`al_${cor}`], id = this.quem(cor);
        r.vai(id, al.x + (al.fx ?? 0), al.z + (al.fz ?? 0.8)); r.acao(id);
        if (!al.ligada) throw new Error(`alavanca ${cor} não ligou`);
      }
    },
    // bloco: a pega, sobe no elevador com b na placa, joga no encaixe olhando para (ox, oz)
    blocoNoAlto(elevador, [bx, bz], [ex, ez], [px, pz], [ax, az], [ox, oz]) {
      r.vai(a, bx, bz); r.acao(a);
      if (!r.P(a).carregando) throw new Error('não pegou o bloco');
      r.vai(a, ex, ez);
      r.vai(b, px, pz, { [a]: {} });
      const el = j.plataformas.find(p => p.id === elevador);
      r.ate(() => el.h >= el.y1);
      r.vai(a, ax, az);
      r.olha(a, ox, oz); r.acao(a); r.espera(40);
    },
    final(id, perto, topo, passo = 0.8) {
      ids.forEach((c, i) => r.vai(c, perto[0] + i * passo, perto[1]));
      const todos = () => Object.fromEntries(ids.map(c => [c, { acao: true }]));
      r.ate(() => j.obras[id].pronta, todos, 600, `obra ${id} não ficou pronta`);
      r.espera(150);
      ids.forEach((c, i) => r.vai(c, topo[0] + i * 0.6, topo[1]));
      r.espera(200);
      return j.resultado;
    },
  };
}

const ROTEIROS = {
  '1-11'(r, ids) {
    const h = ajuda(r, ids), { j, a, b } = h;
    h.obraEmDupla('ponte', [11.5, 10.5], [11.5, 11.5]);
    r.vai(a, 17.5, 9.5); h.feita('m1');
    h.empurrar(16.5, 11.5, 1, 0, () => j.caixas[0].c === 21 && !j.caixas[0].de);
    r.vai(a, 22.5, 3.5); h.feita('m2');
    r.vai(a, 19.5, 17.9); r.acao(a);
    if (!r.P(a).carregando) throw new Error('não pegou o bloco');
    r.vai(a, 23.5, 16.5); r.olha(a, 1, 0); r.acao(a); r.espera(40);
    if (!j.encaixes.enc3.cheio) throw new Error('bloco não encaixou');
    r.vai(b, 27.5, 16.5); h.feita('m3');
    return h.final('escada', [4.3, 6.6], [4.5, 2.5], 0.6);
  },
  '2-11': (r, ids) => canteiro(r, ids),
  '3-11'(r, ids) {
    const h = ajuda(r, ids), { j, a } = h;
    h.alavancas();
    r.vai(a, 5.5, 4.5); h.feita('m1');
    h.blocoNoAlto('elevador', [28.5, 10.9], [21.5, 5.5], [23.5, 8.5], [23.5, 3.5], [1, 0]);
    if (!j.encaixes.enc2.cheio) throw new Error('bloco não encaixou');
    r.vai(a, 29.5, 2.5); h.feita('m2');
    h.empurrar(30.5, 16.5, -1, 0, () => j.caixas[0].c === 25 && !j.caixas[0].de);
    r.vai(a, 27.5, 20.5); h.feita('m3');
    return h.final('ponte', [14.5, 11.6], [14.8, 3.5]);
  },
  '4-11'(r, ids) {
    const h = ajuda(r, ids), { j, a } = h;
    h.obraEmDupla('ponte', [10.5, 8.5], [10.5, 9.5]);
    r.vai(a, 2.5, 4.5); h.feita('m1');
    h.alavancas();
    r.vai(a, 29.5, 3.5); h.feita('m2');
    h.empurrar(13.5, 17.5, -1, 0, () => j.caixas[0].c === 8 && !j.caixas[0].de);
    r.vai(a, 2.5, 17.5); h.feita('m3');
    return h.final('podio', [15.5, 7.2], [15.8, 2.5]);
  },
  '5-11'(r, ids) {
    const h = ajuda(r, ids), { j, a } = h;
    h.alavancas();
    r.vai(a, 10.5, 2.5); h.feita('m1');
    h.empurrar(28.5, 11.5, 0, -1, () => j.caixas[0].l === 6 && !j.caixas[0].de);
    r.vai(a, 32.5, 2.5); h.feita('m2');
    h.blocoNoAlto('elevador', [25.5, 20.9], [29.5, 17.5], [26.5, 14.5], [31.5, 17.5], [0, -1]);
    if (!j.encaixes.enc3.cheio) throw new Error('bloco não encaixou');
    r.vai(a, 33.5, 18.5); h.feita('m3');
    h.obraEmDupla('ponte', [11.5, 16.5], [11.5, 17.5]);
    r.vai(a, 3.5, 16.5); h.feita('m4');
    return h.final('torre', [16.5, 12.6], [16.8, 8.5]);
  },
};

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
  // empurrar para o lado errado (para baixo) não mexe a caixa: ela não pode ficar presa no fim do corredor
  r.vai('loira', 27.5, 12.4);
  r.vai('ruivo', 27.5, 12.4);
  r.espera(60 * 3, { ruivo: joy(0, 1), loira: joy(0, 1) });
  if (r.j.caixas[0].l !== 13) throw new Error('caixa andou para o lado errado');
  return 'ok';
}

const so = process.argv[2];
let falhas = 0;
for (const fase of Object.values(FASES_3D)) {
  if (so && fase.id !== so) continue;
  const jogar = (ids, pessoas) => {
    const r = new Robo(fase, ids, pessoas);
    let res;
    try { res = ROTEIROS[fase.id](r, ids); } catch (e) { res = 'ERRO: ' + e.message; }
    return [r, res];
  };
  for (const ids of COMBOS) {
    const [r, res] = jogar(ids);
    const ok = res === 'vitoria';
    if (!ok) falhas++;
    console.log(`${ok ? '✓' : '✗'} ${fase.id} [${ids.join(',')}] ${res}  t=${r.j.tempo.toFixed(0)}s pecas=${r.j.pecas}`);
  }
  // sozinho com 2 personagens: obras e caixas pedem só 1 ajudante
  {
    const [, res] = jogar(['ruivo', 'loira'], 1);
    if (res !== 'vitoria') falhas++;
    console.log(`${res === 'vitoria' ? '✓' : '✗'} ${fase.id} [sozinho com 2] ${res}`);
  }
  if (fase.id !== '2-11') continue;
  for (const [nome, teste] of [['cooperação obrigatória', exigeDupla], ['resgate de colega caído', resgate]]) {
    let res;
    try { res = teste(fase); } catch (e) { res = 'ERRO: ' + e.message; }
    if (res !== 'ok') falhas++;
    console.log(`${res === 'ok' ? '✓' : '✗'} ${fase.id} ${nome} ${res}`);
  }
}
process.exit(falhas ? 1 : 0);
