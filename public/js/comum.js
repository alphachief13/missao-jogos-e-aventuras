// Constantes compartilhadas entre a tela do jogo e o controle do celular.
export const NOME_JOGO = 'Missão, Jogos e Aventuras';
export const PERSONAGENS = ['ruivo', 'loira', 'cacheado', 'sapo'];
export const CORES = { azul: '#3E93D0', rosa: '#E3205D', amarelo: '#F6BB33', verde: '#A0C630', marinho: '#1E2A4A', peca: '#F6BB33' };
export const PERS_COR = { ruivo: 'azul', loira: 'rosa', cacheado: 'amarelo', sapo: 'verde' };
export const COR_PERS = Object.fromEntries(Object.entries(PERS_COR).map(([p, c]) => [c, p]));
export const NOME_TIME = { azul: 'Time Azul', rosa: 'Time Rosa', amarelo: 'Time Amarelo', verde: 'Time Verde' };
export const MUNDOS = {
  exploradores: { n: 1, nome: 'Exploradores em Ação', selo: 'assets/kit/selo_1.png' },
  construtores: { n: 2, nome: 'Desafio dos Construtores', selo: 'assets/kit/selo_2.png' },
};

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

// Mundo 2: missão que a bússola aponta para um personagem (a mais perto entre as liberadas e não feitas)
// e o ângulo da seta na tela (0 = direita), já na visão isométrica (direita = +x −z, baixo = +x +z).
export function bussola(fase, s, i) {
  if (!fase?.missoes || !s?.missoes || !s.ch[i]) return null;
  const [x, z] = s.ch[i];
  const feita = id => s.missoes[fase.missoes.findIndex(m => m.id === id)];
  let melhor = null;
  fase.missoes.forEach((m, k) => {
    if (s.missoes[k] || (m.depois && !m.depois.every(feita))) return;
    const d = Math.hypot(m.x - x, m.z - z);
    if (!melhor || d < melhor.d) melhor = { m, k, d };
  });
  if (!melhor) return null;
  const dx = melhor.m.x - x, dz = melhor.m.z - z;
  return { ...melhor, numero: melhor.k + 1, feitas: s.missoes.filter(Boolean).length, total: fase.missoes.length,
           angulo: Math.atan2(dx + dz, dx - dz) * 180 / Math.PI };
}
export const SETA = '<svg viewBox="0 0 24 24"><path d="M4 12h13M12 5l7 7-7 7" fill="none" stroke="#1E2A4A" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
