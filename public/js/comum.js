// Constantes compartilhadas entre a tela do jogo e o controle do celular.
export const NOME_JOGO = 'Missão, Jogos e Aventuras';
export const PERSONAGENS = ['ruivo', 'loira', 'cacheado', 'sapo'];
export const CORES = { azul: '#3E93D0', rosa: '#E3205D', amarelo: '#F6BB33', verde: '#A0C630', marinho: '#1E2A4A', peca: '#F6BB33' };
export const PERS_COR = { ruivo: 'azul', loira: 'rosa', cacheado: 'amarelo', sapo: 'verde' };
export const COR_PERS = Object.fromEntries(Object.entries(PERS_COR).map(([p, c]) => [c, p]));
export const NOME_TIME = { azul: 'Time Azul', rosa: 'Time Rosa', amarelo: 'Time Amarelo', verde: 'Time Verde' };
// Os 5 mundos (fases da colônia). lado: cores da estrutura das fases de plataforma (tons foscos; cor forte é só do time)
// e o tom do fundo pintado; iso: chão e céu do mapa 3D; planeta: cores do mundinho na escolha de fase.
export const MUNDOS = {
  exploradores: { n: 1, nome: 'Exploradores em Ação', selo: 'assets/kit/selo_1.png', cor: '#A0C630',
    lado: { creme: '#F3E7CC', cinza: '#E0CBA5', moldura: '#8A6A48', grama: '#5F8A4A', tom: '#FFFFFF' },
    iso: { grama: '#CFE3A8', grama2: '#C4DB9B', terra: '#B38A60', topo: '#F3E7CC', lado: '#E0CBA5', muro: '#FFFFFF', muro2: '#EFE8D8', agua: '#6EC1EA', fundo: '#9CCBDD', ceu: '#DCEFD0' },
    planeta: { mar: '#6EC1EA', terra: '#8DC26F', terra2: '#6FA95A', detalhe: 'arvores' } },
  construtores: { n: 2, nome: 'Desafio dos Construtores', selo: 'assets/kit/selo_2.png', cor: '#F6BB33',
    lado: { creme: '#F6E5C4', cinza: '#E8CD9F', moldura: '#9A6B3C', grama: '#B8743F', tom: '#FFD29E' },
    iso: { grama: '#E8DAB4', grama2: '#DFCFA6', terra: '#B38A60', topo: '#F6E5C4', lado: '#E8CD9F', muro: '#FFFFFF', muro2: '#F1E6D2', agua: '#6EC1EA', fundo: '#9CCBDD', ceu: '#F4E9D3' },
    planeta: { mar: '#7CC6E6', terra: '#E7B66B', terra2: '#D49A52', detalhe: 'blocos' } },
  robotica: { n: 3, nome: 'Mestres da Robótica', selo: 'assets/kit/selo_3.png', cor: '#3E93D0',
    lado: { creme: '#E6EBF1', cinza: '#CCD5DF', moldura: '#56677C', grama: '#7D8FA6', tom: '#AFCBEB' },
    iso: { grama: '#DDE4EC', grama2: '#D2DAE4', terra: '#8C99A8', topo: '#F0F3F7', lado: '#C3CCD6', muro: '#FFFFFF', muro2: '#E3E8EE', agua: '#7FD3E8', fundo: '#8FB7CC', ceu: '#D8E6F2' },
    planeta: { mar: '#6FB7E0', terra: '#B9C6D4', terra2: '#93A4B8', detalhe: 'engrenagens' } },
  gincana: { n: 4, nome: 'Gincana das Aventuras', selo: 'assets/kit/selo_4.png', cor: '#F39A2B',
    lado: { creme: '#F4ECDA', cinza: '#E5D5B6', moldura: '#7A5A3A', grama: '#B5604A', tom: '#FFDDB0' },
    iso: { grama: '#C3E29E', grama2: '#B6D990', terra: '#B38A60', topo: '#F4ECDA', lado: '#E5D5B6', muro: '#FFFFFF', muro2: '#F3E9DA', agua: '#6EC1EA', fundo: '#9CCBDD', ceu: '#E4F3D4' },
    planeta: { mar: '#6EC1EA', terra: '#9ED36A', terra2: '#C8644E', detalhe: 'pista' } },
  conquistas: { n: 5, nome: 'Grandes Conquistas', selo: 'assets/kit/selo_5.png', cor: '#B23FA8',
    lado: { creme: '#F6EDD6', cinza: '#E7D7AE', moldura: '#6B5A8E', grama: '#B89A4A', tom: '#DCC4FA' },
    iso: { grama: '#EADFC4', grama2: '#E2D6B8', terra: '#A88A60', topo: '#F6EDD6', lado: '#E7D7AE', muro: '#FFFFFF', muro2: '#EFE6F7', agua: '#7CC6E6', fundo: '#A9B9DD', ceu: '#EFE6F7' },
    planeta: { mar: '#8FA9E6', terra: '#F2CF6B', terra2: '#9C7FD0', detalhe: 'trofeus' } },
};
export const ORDEM_MUNDOS = Object.keys(MUNDOS);

const svg = corpo => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${corpo}</svg>`);
const M = '#1E2A4A';

// Ícones desenhados em SVG (o kit não tem; nada de pixel).
export const ICONE = {
  coracao: svg(`<path d="M50 86 C20 64 8 48 8 32 C8 18 19 9 31 9 C40 9 46 14 50 21 C54 14 60 9 69 9 C81 9 92 18 92 32 C92 48 80 64 50 86Z" fill="#E3205D" stroke="${M}" stroke-width="6" stroke-linejoin="round"/><ellipse cx="30" cy="28" rx="9" ry="6" fill="#fff" opacity=".7" transform="rotate(-30 30 28)"/>`),
  coracaoVazio: svg(`<path d="M50 86 C20 64 8 48 8 32 C8 18 19 9 31 9 C40 9 46 14 50 21 C54 14 60 9 69 9 C81 9 92 18 92 32 C92 48 80 64 50 86Z" fill="#E6E9F0" stroke="${M}" stroke-width="6" stroke-linejoin="round" opacity=".55"/>`),
  planador: svg(`<path d="M6 46 Q50 -6 94 46 Q50 24 6 46Z" fill="#3E93D0" stroke="${M}" stroke-width="5" stroke-linejoin="round"/><path d="M22 34 Q50 14 78 34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/><path d="M14 44 L46 78 M86 44 L54 78 M50 30 L50 78" stroke="${M}" stroke-width="3"/><circle cx="50" cy="82" r="9" fill="#F6BB33" stroke="${M}" stroke-width="4"/>`),
  mola: svg(`<path d="M30 58 Q70 50 70 58 Q30 66 30 58 M30 70 Q70 62 70 70 Q30 78 30 70 M30 82 Q70 74 70 82 Q30 90 30 82" fill="none" stroke="#A0C630" stroke-width="7" stroke-linecap="round"/><path d="M14 46 Q14 22 40 22 L62 22 Q70 22 72 30 L88 36 Q94 40 90 46 Z" fill="#E3205D" stroke="${M}" stroke-width="5" stroke-linejoin="round"/><path d="M36 30 L58 30" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  somLigado: svg(`<path d="M18 38 H34 L54 20 V80 L34 62 H18 Z" fill="#fff" stroke="${M}" stroke-width="6" stroke-linejoin="round"/><path d="M66 36 Q76 50 66 64 M76 26 Q92 50 76 74" fill="none" stroke="${M}" stroke-width="6" stroke-linecap="round"/>`),
  somDesligado: svg(`<path d="M18 38 H34 L54 20 V80 L34 62 H18 Z" fill="#fff" stroke="${M}" stroke-width="6" stroke-linejoin="round"/><path d="M66 38 L88 62 M88 38 L66 62" stroke="#E3205D" stroke-width="7" stroke-linecap="round"/>`),
  esq: svg(`<path d="M62 22 L34 50 L62 78" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`),
  dir: svg(`<path d="M38 22 L66 50 L38 78" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`),
  pulo: svg(`<path d="M22 62 L50 34 L78 62" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`),
  acao: svg(`<path d="M34 54 V30 Q34 24 40 24 Q46 24 46 30 V48 M46 44 V22 Q46 16 52 16 Q58 16 58 22 V46 M58 44 V26 Q58 20 64 20 Q70 20 70 26 V50 M70 46 V36 Q70 30 76 30 Q82 30 82 36 V58 Q82 84 56 84 Q38 84 30 70 L20 52 Q17 46 23 44 Q28 42 32 48 L34 54" fill="#fff" stroke="none"/>`),
  trocar: svg(`<path d="M28 42 A24 24 0 0 1 72 34 M72 58 A24 24 0 0 1 28 66" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M62 22 L76 36 L58 42 Z M38 78 L24 64 L42 58 Z" fill="#fff"/>`),
};

export const ITENS = {
  coracao: { icone: ICONE.coracao, desc: '+1 coração para o time na próxima fase.' },
  mola: { icone: ICONE.mola, desc: 'Pula bem mais alto durante a fase.' },
  planador: { icone: ICONE.planador, desc: 'Segure PULAR caindo para planar devagar.' },
};

// Mundo 2: em que passo cada missão está. O passo atual é o seguinte ao último passo já feito.
// feito: { obra } pronta, { placa } pisada agora, { alavancas: [...] } todas puxadas, { encaixe } cheio, { missao } concluída.
export function passoDaMissao(fase, s, k, cor = null) {
  const m = fase.missoes[k];
  const lista = m.passos || [{ texto: m.dica, feito: { missao: m.id } }];
  const idx = (arr, id) => arr?.findIndex(o => o.id === id) ?? -1;
  const feito = f => {
    if (f.missao) return !!s.missoes[idx(fase.missoes, f.missao)];
    if (f.obra) return !!s.obras?.[idx(fase.obras, f.obra)]?.[3];
    if (f.placa) return !!s.bot?.[idx(fase.botoes, f.placa)];
    if (f.encaixe) return !!s.enc?.[idx(fase.encaixes, f.encaixe)];
    if (f.alavancas) return f.alavancas.every(id => idx(fase.alavancas, id) < 0 || s.alav[idx(fase.alavancas, id)]);
    if (f.bloco) { // bloco pego (saiu do lugar) ou já encaixado
      const k = idx(fase.blocos, f.bloco), b = s.blocos?.[k], o = fase.blocos?.[k];
      return !!b && (!!b[3] || Math.hypot(b[0] - o.x, b[1] - o.z) > 0.6);
    }
    return false;
  };
  let i = 0;
  lista.forEach((p, n) => { if (feito(p.feito)) i = n + 1; });
  i = Math.min(i, lista.length - 1);
  const passo = lista[i];
  let alvo = passo.alvo || [m.x, m.z];
  // alavancas: aponta a da cor do time (se ainda não foi puxada), senão qualquer uma que falte
  if (passo.feito.alavancas) {
    const falta = passo.feito.alavancas.map(id => fase.alavancas[idx(fase.alavancas, id)]).filter((a, n) => a && !s.alav[idx(fase.alavancas, a.id)]);
    const minha = falta.find(a => a.cor === cor) || falta.find(a => !a.cor) || falta[0];
    if (minha) alvo = [minha.x + (minha.fx ?? 0), minha.z + (minha.fz ?? 0.8)]; // fx/fz: de que lado se chega na alavanca
  }
  return { i, total: lista.length, texto: passo.texto, alvo };
}

// Missão que a bússola aponta para um personagem (a mais perto entre as liberadas e não feitas), com o passo atual
// e o ângulo da seta na tela (0 = direita), já na visão isométrica (direita = +x −z, baixo = +x +z).
export function bussola(fase, s, i) {
  if (!fase?.missoes || !s?.missoes || !s.ch[i]) return null;
  const [x, z] = s.ch[i];
  const cor = PERS_COR[fase.personagens[i]?.id];
  const feita = id => s.missoes[fase.missoes.findIndex(m => m.id === id)];
  let melhor = null;
  fase.missoes.forEach((m, k) => {
    if (s.missoes[k] || (m.depois && !m.depois.every(feita))) return;
    const passo = passoDaMissao(fase, s, k, cor);
    const d = Math.hypot(passo.alvo[0] - x, passo.alvo[1] - z);
    if (!melhor || d < melhor.d) melhor = { m, k, d, passo };
  });
  if (!melhor) return null;
  // A seta segue o caminho de verdade (contornando muros e água), mirando uns passos à frente.
  const rota = caminho(fase, s, cor, [x, z], melhor.passo.alvo);
  const mira = rota && rota.length > 1 ? rota[Math.min(2, rota.length - 1)] : melhor.passo.alvo;
  const dx = mira[0] - x, dz = mira[1] - z;
  return { ...melhor, numero: melhor.k + 1, feitas: s.missoes.filter(Boolean).length, total: fase.missoes.length,
           alvo: melhor.passo.alvo, rota, perto: melhor.d < 1.5, angulo: Math.atan2(dx + dz, dx - dz) * 180 / Math.PI };
}

// Caminho em tiles (centros) de (x0, z0) até (x1, z1) no mapa 3D, com as plataformas como estão agora:
// passa por chão da cor do time, sobe degraus de até 1 bloco pulando, não entra na água. null se não houver.
const COR_CHAO = { b: 'azul', r: 'rosa', y: 'amarelo', g: 'verde' };
const cacheCaminho = new Map();
export function caminho(fase, s, cor, [x0, z0], [x1, z1]) {
  const L = fase.mapa.length, C = fase.mapa[0].length;
  const c0 = Math.floor(x0), l0 = Math.floor(z0), c1 = Math.floor(x1), l1 = Math.floor(z1);
  const chave = `${fase.id}|${cor}|${c0},${l0}>${c1},${l1}|${(s.plat || []).join()}`;
  if (cacheCaminho.has(chave)) return cacheCaminho.get(chave);
  const plat = new Map();
  (fase.plataformas || []).forEach((p, i) => {
    const h = s.plat?.[i];
    if (h === null || h === undefined) return;
    for (let l = p.z; l < p.z + p.d; l++) for (let c = p.x; c < p.x + p.w; c++) plat.set(l * C + c, Math.max(plat.get(l * C + c) ?? -9, h));
  });
  const topo = (c, l) => {
    if (c < 0 || l < 0 || c >= C || l >= L) return 99;
    if (plat.has(l * C + c)) return plat.get(l * C + c);
    const t = fase.mapa[l][c];
    if (t === '#' || t === 'T') return 99;
    if (t === '~') return -1;
    if (COR_CHAO[t]) return COR_CHAO[t] === cor ? 0 : 99;
    return Number(t) || 0;
  };
  const veio = new Map([[l0 * C + c0, -1]]);
  const fila = [[c0, l0]];
  while (fila.length) {
    const [c, l] = fila.shift();
    if (c === c1 && l === l1) break;
    const h = topo(c, l);
    for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [c + dc, l + dl], k = n[1] * C + n[0];
      if (veio.has(k)) continue;
      const t = topo(...n);
      if (t >= 99 || t < 0 || t > h + 1.3) continue;
      veio.set(k, l * C + c);
      fila.push(n);
    }
  }
  let rota = null;
  if (veio.has(l1 * C + c1)) {
    rota = [];
    for (let k = l1 * C + c1; k !== -1 && k !== l0 * C + c0; k = veio.get(k)) rota.unshift([k % C + 0.5, Math.floor(k / C) + 0.5]);
  }
  if (cacheCaminho.size > 200) cacheCaminho.clear();
  cacheCaminho.set(chave, rota);
  return rota;
}
export const SETA = '<svg viewBox="0 0 24 24"><path d="M4 12h13M12 5l7 7-7 7" fill="none" stroke="#1E2A4A" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
