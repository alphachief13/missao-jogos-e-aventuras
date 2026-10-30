// Monta as fases de plataforma (vista de lado) a partir de receitas curtas (ver fases.js).
//
// Cada fase é uma pilha de andares em zigue-zague: o andar 0 é o chão, cada andar atravessa a tela e um
// conector (escada, elevador de botões ou elevador automático) sobe para o próximo; no último ficam os arcos.
// Andares têm 4 linhas livres (o último, 5) e uma laje de 1 linha: H = 5 × andares + 2.
// Os trechos de um andar são montados "da esquerda para a direita" e espelhados quando o andar vai para a esquerda.
//
// A fase sai com o roteiro (passos na ordem, em coordenadas do mapa), usado pelo robô de teste,
// e com setas que mostram o caminho na tela.

const LETRA = { azul: 'b', rosa: 'r', amarelo: 'y', verde: 'g' };
const IDS = ['ruivo', 'loira', 'cacheado', 'sapo'];
const CORES = ['azul', 'rosa', 'amarelo', 'verde'];

// ---------- trechos (usados nas receitas) ----------
export const T = {
  poca: (cor, n = 2) => ({ tipo: 'poca', cor, n, w: n + 2 }),          // poça de tinta: só o time da cor pisa
  curto: (n = 2) => ({ tipo: 'poca', cor: null, n, w: n + 2 }),         // curto-circuito: todos pulam
  elevado: (n = 2) => ({ tipo: 'elevado', n, w: n + 2 }),               // degrau de 1 bloco de altura
  pedras: (a = 2, b = 2) => ({ tipo: 'pedras', a, b, w: a + b + 4 }),   // curto, pedra de 2, curto
  porta: () => ({ tipo: 'porta', w: 7 }),                               // porta com botão dos dois lados
  ponte: (n = 3) => ({ tipo: 'ponte', n, w: n + 6 }),                   // ponte que sobe com botão dos dois lados
  balsa: (n = 5) => ({ tipo: 'balsa', n, w: n + 2 }),                   // plataforma automática sobre curto-circuito
  alavanca: (cor = null, alto = false) => ({ tipo: 'alavanca', cor, alto, w: 3 }),
  portao: () => ({ tipo: 'portao', w: 3 }),                             // abre com as alavancas desde o último portão
};

// ---------- montagem ----------
// rec: { nome, dica, coracoes, d0 (1 = começa indo para a direita, -1 = esquerda), andares: [[trechos]], conectores: [...] }
export function montarFase(id, mundo, rec) {
  const nf = rec.andares.length;
  const H = 5 * nf + 2;
  const conect = rec.conectores || [];
  if (conect.length !== nf - 1) throw new Error(`${id}: ${nf} andares pedem ${nf - 1} conectores`);
  // começo e fim livres de cada andar (no referencial do andar, indo para a direita)
  const inicio = k => (k === 0 ? 5 : conect[k - 1] === 'elevador' ? 9 : 6);
  const cauda = k => (k === nf - 1 ? 11 : conect[k] === 'elevador' ? 8 : 6);
  const precisa = rec.andares.map((ts, k) => inicio(k) + ts.reduce((a, t) => a + t.w, 0) + Math.max(0, ts.length - 1) + cauda(k));
  let W = Math.max(24, rec.largura || 0, ...precisa);
  W += W % 2;
  if (W > 34) throw new Error(`${id}: largura ${W} demais (${precisa.join(', ')})`);

  const g = Array.from({ length: H }, (_, l) => Array.from({ length: W }, (_, c) => (l === 0 || l === H - 1 || c === 0 || c === W - 1 ? '#' : '.')));
  const fase = {
    id, mundo, nome: rec.nome, dica: rec.dica, coracoes: rec.coracoes ?? 3,
    mapa: null, personagens: [], portais: [], gemas: [], alavancas: [], botoes: [], plataformas: [],
    setas: [], enfeites: [], roteiro: [],
  };
  const R = k => H - 1 - 5 * k;
  const dirDe = k => (rec.d0 || 1) * (k % 2 ? -1 : 1);
  let nAl = 0, nBt = 0, nPl = 0, alSoltas = [];
  const livres = [];   // [x, y] de chão livre (para bandeirinhas, peças e enfeites)
  const pecas = [];
  const bandeiras = {}; // cor → [x, y] (por cima da poça da cor, quando houver)

  for (let k = 0; k < nf; k++) {
    const r = R(k), d = dirDe(k), topo = k === nf - 1;
    const ch = topo ? 5 : 4;                      // linhas livres do corredor
    const X = x => (d > 0 ? x : W - x);           // ponto
    const C = c => (d > 0 ? c : W - 1 - c);       // coluna
    const Px = (x, w) => (d > 0 ? x : W - x - w); // borda esquerda de algo com largura w
    const set = (l, c, t) => { g[l][C(c)] = t; };
    // laje do andar (o andar 0 é a borda de baixo); acima do conector que chega fica o vão
    for (let c = 1; c < W - 1; c++) set(r, c, '#');
    if (k > 0) for (let c = 1; c <= 3; c++) set(r, c, '.');
    const passo = p => fase.roteiro.push({ ...p, R: r });
    const ir = x => passo({ t: 'ir', x: X(x) });

    if (k === 0) IDS.forEach((p, i) => fase.personagens.push({ id: p, x: X(1.5 + i * 0.6), y: r }));
    // seta do sentido do andar, logo no começo
    fase.setas.push({ x: X(inicio(k) - 1.2), y: r - 2.4, dir: d > 0 ? 'dir' : 'esq' });

    // distribui os trechos com folga igual entre eles
    const ts = rec.andares[k];
    const ocupado = ts.reduce((a, t) => a + t.w, 0);
    const vao = W - cauda(k) - inicio(k) - ocupado;
    const folga = ts.length > 1 ? Math.floor(vao / (ts.length - 1 + 2)) : Math.floor(vao / 2);
    let x0 = inicio(k) + Math.max(0, Math.floor((vao - folga * Math.max(0, ts.length - 1)) / 2));
    let ultimoLivre = inicio(k);
    const marcaLivre = (a, b) => { for (let c = a; c < b; c++) livres.push({ k, x: X(c + 0.5), c: C(c), y: r }); };
    for (const t of ts) {
      marcaLivre(ultimoLivre, x0);
      switch (t.tipo) {
        case 'poca': {
          if (t.n > 2 && !topo) throw new Error(`${id}: poça de ${t.n} só no último andar (teto baixo)`);
          const letra = t.cor ? LETRA[t.cor] : 'x';
          for (let i = 0; i < t.n; i++) set(r, x0 + 1 + i, letra);
          if (t.cor) bandeiras[t.cor] ??= [X(x0 + 1 + t.n / 2), r - 0.45];
          pecas.push([X(x0 + 1 + t.n / 2), r - 2.3]);
          ir(x0 + t.w + 0.5);
          break;
        }
        case 'elevado':
          for (let i = 0; i < t.n; i++) set(r - 1, x0 + 1 + i, '#');
          pecas.push([X(x0 + 1 + t.n / 2), r - 1.7]);
          ir(x0 + t.w + 0.5);
          break;
        case 'pedras':
          if ((t.a > 2 || t.b > 2) && !topo) throw new Error(`${id}: pedras com vão de 3 só no último andar`);
          for (let i = 0; i < t.a; i++) set(r, x0 + 1 + i, 'x');
          for (let i = 0; i < t.b; i++) set(r, x0 + 3 + t.a + i, 'x');
          pecas.push([X(x0 + 2 + t.a), r - 0.7]);
          ir(x0 + t.w + 0.5);
          break;
        case 'porta': {
          const id1 = `b${++nBt}`, id2 = `b${++nBt}`, pl = `p${++nPl}`, h = ch - 1;
          fase.botoes.push({ id: id1, x: X(x0 + 1.5), y: r }, { id: id2, x: X(x0 + 5.5), y: r });
          fase.plataformas.push({ id: pl, tipo: 'portao', x: Px(x0 + 3, 1), y: r - h, x2: Px(x0 + 3, 1), y2: r - 2 - h, w: 1, h,
                                  gatilhos: [id1, id2], modo: 'ou', vel: 7 });
          passo({ t: 'porta', pl, aberto: r - 2 - h, b1: X(x0 + 1.5), b2: X(x0 + 5.5), alem: X(x0 + t.w + 0.5) });
          break;
        }
        case 'ponte': {
          const id1 = `b${++nBt}`, id2 = `b${++nBt}`, pl = `p${++nPl}`;
          for (let i = 0; i < t.n; i++) set(r, x0 + 3 + i, 'x');
          fase.botoes.push({ id: id1, x: X(x0 + 1.5), y: r }, { id: id2, x: X(x0 + 4.5 + t.n), y: r });
          fase.plataformas.push({ id: pl, tipo: 'ponte', x: Px(x0 + 3, t.n), y: r + 0.5, x2: Px(x0 + 3, t.n), y2: r, w: t.n, h: 0.5,
                                  gatilhos: [id1, id2], modo: 'ou', vel: 3 });
          pecas.push([X(x0 + 3 + t.n / 2), r - 0.7]);
          passo({ t: 'porta', pl, aberto: r, b1: X(x0 + 1.5), b2: X(x0 + 4.5 + t.n), alem: X(x0 + t.w + 0.5) });
          break;
        }
        case 'balsa': {
          const pl = `p${++nPl}`;
          for (let i = 0; i < t.n; i++) set(r, x0 + 1 + i, 'x');
          fase.plataformas.push({ id: pl, tipo: 'movel', x: Px(x0 + 1, 2), y: r, x2: Px(x0 + t.n - 1, 2), y2: r, w: 2, h: 0.5,
                                  modo: 'auto', vel: 2.2, pausa: 1.2 });
          pecas.push([X(x0 + 1 + t.n / 2), r - 1.2]);
          passo({ t: 'balsa', pl, antes: X(x0 + 0.55), depois: X(x0 + t.w + 0.5) });
          break;
        }
        case 'alavanca': {
          const id = `a${++nAl}`;
          if (t.alto) set(r - 1, x0 + 1, '#');
          const y = t.alto ? r - 1 : r;
          fase.alavancas.push({ id, x: X(x0 + 1.5), y, ...(t.cor && { cor: t.cor }) });
          alSoltas.push(id);
          passo({ t: 'alavanca', id, cor: t.cor, x: X(x0 + 1.5) });
          ir(x0 + t.w + 0.5);
          break;
        }
        case 'portao': {
          if (!alSoltas.length) throw new Error(`${id}: portão sem alavanca antes`);
          const pl = `p${++nPl}`, h = ch - 1;
          fase.plataformas.push({ id: pl, tipo: 'portao', x: Px(x0 + 1, 1), y: r - h, x2: Px(x0 + 1, 1), y2: r - 2 - h, w: 1, h,
                                  gatilhos: alSoltas, modo: 'e', vel: 4 });
          alSoltas = [];
          passo({ t: 'portao', pl, aberto: r - 2 - h });
          ir(x0 + t.w + 0.5);
          break;
        }
        default: throw new Error(`${id}: trecho ${t.tipo}?`);
      }
      x0 += t.w;
      ultimoLivre = x0;
      x0 += folga;
    }
    marcaLivre(ultimoLivre, W - cauda(k) + (topo ? 0 : 1));

    if (topo) {
      // arcos de chegada no fim do último andar
      CORES.forEach((cor, i) => fase.portais.push({ cor, x: X(W - 8.6 + i * 1.9), y: r }));
      passo({ t: 'chegada' });
      continue;
    }
    // conector para o próximo andar (no fim deste)
    const tipo = conect[k];
    const chegada = X(W - 4.7);   // pé na ponta da laje de cima
    if (tipo === 'escada') {
      set(r - 1, W - 4, '#');
      set(r - 1, W - 3, '#'); set(r - 2, W - 3, '#');
      set(r - 1, W - 2, '#'); set(r - 2, W - 2, '#'); set(r - 3, W - 2, '#');
      passo({ t: 'escada', antes: X(W - 4.6), degraus: [X(W - 3.5), X(W - 2.5), X(W - 1.5)], borda: X(W - 1.75), chegada });
    } else if (tipo === 'elevador') {
      const bb = `b${++nBt}`, bc = `b${++nBt}`, pl = `p${++nPl}`;
      fase.botoes.push({ id: bb, x: X(W - 6.5), y: r }, { id: bc, x: X(W - 7.5), y: r - 5 });
      fase.plataformas.push({ id: pl, tipo: 'elevador', x: Px(W - 4, 2), y: r - 5, x2: Px(W - 4, 2), y2: r - 0.5, w: 2, h: 0.5,
                              gatilhos: [bb, bc], modo: 'ou', vel: 4 });
      passo({ t: 'elevador', pl, baixo: r - 0.5, cima: r - 5, bBaixo: X(W - 6.5), bCima: X(W - 7.5), fora: X(W - 8.2),
              embarque: X(W - 3), chegada });
    } else if (tipo === 'auto') {
      const pl = `p${++nPl}`;
      fase.plataformas.push({ id: pl, tipo: 'elevador', x: Px(W - 4, 2), y: r - 0.5, x2: Px(W - 4, 2), y2: r - 5, w: 2, h: 0.5,
                              modo: 'auto', vel: 2.4, pausa: 1.6 });
      passo({ t: 'auto', pl, antes: X(W - 4.6), embarque: X(W - 3), chegada });
    } else throw new Error(`${id}: conector ${tipo}?`);
    fase.setas.push({ x: X(W - 3), y: r - 3.4, dir: 'cima' });
  }

  // portas e portões abrem para cima, encostando na laje de cima: ali a laje precisa ser bloco
  // Portas e portões sobem até encostar na laje de cima. No chão de baixo, ou se em cima houver poça, descem para dentro
  // do chão (sobrando 2 linhas livres no corredor de baixo, onde então não pode haver degrau).
  for (const p of fase.plataformas) {
    if (p.tipo !== 'portao') continue;
    const c = Math.round(p.x), chao = p.y + p.h, l = Math.round(p.y2);
    if (p.y2 < 1 || (g[l][c] === '#' && chao < H - 1)) continue;
    const livreEmbaixo = [1, 2, 3, 4].every(i => chao + i > H - 1 || g[chao + i][c] === '.');
    if (!livreEmbaixo) throw new Error(`${id}: a porta da coluna ${c} não tem para onde abrir\n${g.map(l => l.join("")).join("\n")}`);
    p.y2 = chao + 0.05;
    fase.roteiro.find(o => o.pl === p.id).aberto = p.y2;
  }
  fase.mapa = g.map(l => l.join(''));

  // bandeirinhas: por cima da poça da cor, ou num chão livre (uma por andar, espalhadas)
  const usados = new Set();
  const livreEm = (i) => {
    const ok = livres.filter(o => !usados.has(o) && fase.mapa[o.y - 1]?.[o.c] === '.' && fase.mapa[o.y]?.[o.c] === '#');
    if (!ok.length) return null;
    const o = ok[Math.floor((i * 0.37 + 0.2) * ok.length) % ok.length];
    usados.add(o);
    return o;
  };
  CORES.forEach((cor, i) => {
    const pos = bandeiras[cor] || (o => o && [o.x, o.y - 0.5])(livreEm(i * 1.7 + 0.5));
    if (pos) fase.gemas.push({ cor, x: pos[0], y: pos[1] });
  });
  for (const [x, y] of pecas.slice(0, 9)) fase.gemas.push({ cor: 'peca', x, y });
  for (let i = 0; fase.gemas.length < 12 && i < 6; i++) { const o = livreEm(i + 3); if (o) fase.gemas.push({ cor: 'peca', x: o.x, y: o.y - 0.6 }); }
  // enfeites do mundo, no fundo do corredor
  for (let i = 0; i < 5; i++) { const o = livreEm(i * 2 + 1); if (o) fase.enfeites.push({ x: o.x, y: o.y, v: i }); }
  return fase;
}
