// Fase 3D (mapa isométrico aberto) do fim de cada mundo: missões espalhadas em qualquer ordem e uma missão final
// em que todos precisam chegar juntos. Mesmo formato do Mundo 2 (ver fases_mundo2.js e sim_iso.js).
// Os mapas são desenhados por retângulos: desenhar(colunas, linhas, [[tile, x0, z0, x1, z1], ...]), na ordem.
import { FASES_MUNDO2 } from './fases_mundo2.js';

function desenhar(C, L, ops) {
  const g = Array.from({ length: L }, (_, l) => Array.from({ length: C }, (_, c) => (l === 0 || c === 0 || l === L - 1 || c === C - 1 ? '#' : '0')));
  for (const [t, x0, z0, x1 = x0, z1 = z0] of ops) for (let l = z0; l <= z1; l++) for (let c = x0; c <= x1; c++) g[l][c] = t;
  return g.map(l => l.join(''));
}
const pecas = lista => lista.map(([x, z]) => ({ cor: 'peca', x, z }));
const bandeiras = lista => ['azul', 'rosa', 'amarelo', 'verde'].map((cor, i) => ({ cor, x: lista[i][0], z: lista[i][1] }));
const alavancasCores = (pos, frente) => ['azul', 'rosa', 'amarelo', 'verde'].map((cor, i) => ({ id: `al_${cor}`, cor, x: pos[i][0], z: pos[i][1], ...frente }));
const TODAS = ['al_azul', 'al_rosa', 'al_amarelo', 'al_verde'];
const enfeites = lista => lista.map(([tipo, x, z]) => ({ tipo, x, z }));

// ---------- Mundo 1 · Acampamento dos Exploradores ----------
const ACAMPAMENTO = {
  id: '1-11', mundo: 'exploradores', modo: 'iso', nome: 'Acampamento dos Exploradores', coracoes: 3,
  dica: 'Atravessem o rio, abram o mirante e o cercado. Depois, todos juntos na fogueira do morro!',
  mapa: desenhar(30, 22, [
    ['~', 12, 1, 15, 20],                                  // rio largo
    ['3', 2, 1, 8, 3], ['#', 9, 1, 9, 6], ['#', 1, 6, 9, 6], ['0', 4, 6, 6, 6], // morro da fogueira, cerca e portão
    ['#', 16, 7, 28, 7], ['0', 21, 7, 22, 7],              // cerca do mirante
    ['#', 24, 13, 28, 13], ['#', 24, 14, 24, 18],          // cercado do tesouro (portão embaixo)
    ['T', 27, 2], ['T', 1, 9], ['T', 18, 19], ['T', 28, 9], ['T', 10, 3],
  ]),
  personagens: [{ id: 'ruivo', x: 2.5, z: 18.5 }, { id: 'loira', x: 3.5, z: 18.5 }, { id: 'cacheado', x: 2.5, z: 19.5 }, { id: 'sapo', x: 3.5, z: 19.5 }],
  missoes: [
    { id: 'm1', nome: 'A ponte de troncos', x: 17.5, z: 9.5, icone: 'mapa',
      passos: [
        { texto: 'Dois times seguram ✋ AÇÃO juntos na beira do rio para montar a ponte de troncos.', alvo: [11.5, 10.6], feito: { obra: 'ponte' } },
        { texto: 'A ponte ficou pronta! Atravessem o rio e toquem a bandeira 1.', feito: { missao: 'm1' } },
      ] },
    { id: 'm2', nome: 'O mirante', x: 22.5, z: 3.5, icone: 'bussola',
      passos: [
        { texto: 'Dois times ficam atrás da caixa pesada e empurram juntos para a DIREITA até a placa.', alvo: [16.5, 11.5], feito: { placa: 'placa2' } },
        { texto: 'O portão do mirante abriu! Toquem a bandeira 2.', feito: { missao: 'm2' } },
      ] },
    { id: 'm3', nome: 'O cercado do tesouro', x: 27.5, z: 16.5, icone: 'lupa',
      passos: [
        { texto: 'Peguem o bloco branco (✋ AÇÃO).', alvo: [19.5, 17.5], feito: { bloco: 'bloco' } },
        { texto: 'Levem o bloco até a cerca e joguem por cima, no encaixe com a seta (✋ AÇÃO).', alvo: [23.5, 16.5], feito: { encaixe: 'enc3' } },
        { texto: 'O portão do cercado abriu (embaixo)! Toquem a bandeira 3.', feito: { missao: 'm3' } },
      ] },
    { id: 'm4', nome: 'A fogueira do morro', x: 5.5, z: 2.5, icone: 'trofeu', todos: true, final: true, depois: ['m1', 'm2', 'm3'],
      passos: [
        { texto: 'O portão do morro abriu! TODOS os times seguram ✋ AÇÃO juntos na obra da escada.', alvo: [5.5, 6.6], feito: { obra: 'escada' } },
        { texto: 'Subam a escada pulando e fiquem TODOS juntos perto da fogueira.', feito: { missao: 'm4' } },
      ] },
  ],
  gemas: [
    ...bandeiras([[2.5, 12.5], [26.5, 3.5], [27.5, 19.5], [10.5, 5.5]]),
    ...pecas([[5.5, 14.5], [8.5, 17.5], [10.5, 10.5], [6.5, 9.5], [19.5, 9.5], [24.5, 10.5], [17.5, 3.5], [27.5, 5.5],
              [21.5, 15.5], [16.5, 20.5], [26.5, 14.5], [3.5, 4.5], [7.5, 2.5], [1.5, 1.5]]),
  ],
  obras: [
    { id: 'ponte', x: 12, z: 10, w: 4, d: 2, times: 2, tempo: 3 },
    { id: 'escada', x: 4, z: 4, w: 3, d: 2, times: 'todos', tempo: 3 },
  ],
  caixas: [{ id: 'caixa', x: 17.5, z: 11.5, peso: 2, direcoes: ['leste'] }],
  botoes: [{ id: 'placa2', x: 21.5, z: 11.5 }],
  alavancas: [],
  blocos: [{ id: 'bloco', x: 19.5, z: 17.5 }],
  encaixes: [{ id: 'enc3', x: 25.5, z: 16.5 }],
  plataformas: [
    { id: 'ponte_rio', tipo: 'ponte', x: 12, z: 10, w: 4, d: 2, y0: null, y1: 0, gatilhos: ['ponte'] },
    { id: 'portao2', tipo: 'portao', x: 21, z: 7, w: 2, d: 1, y0: 3, y1: 0, gatilhos: ['placa2'], vel: 5 },
    { id: 'portao3', tipo: 'portao', x: 24, z: 19, w: 1, d: 2, y0: 3, y1: 0, gatilhos: ['enc3'], vel: 5 },
    { id: 'portao4', tipo: 'portao', x: 4, z: 6, w: 3, d: 1, y0: 3, y1: 0, gatilhos: ['m1', 'm2', 'm3'], modo: 'e', vel: 3 },
    { id: 'degrau1', tipo: 'degrau', x: 4, z: 5, w: 3, d: 1, y0: 0, y1: 1, gatilhos: ['escada'], vel: 1.5 },
    { id: 'degrau2', tipo: 'degrau', x: 4, z: 4, w: 3, d: 1, y0: 0, y1: 2, gatilhos: ['escada'], vel: 1.5 },
  ],
  enfeites: enfeites([
    ['barraca', 6.5, 17.5], ['barraca', 8.5, 19.5], ['fogueira', 3.5, 1.5], ['flores', 1.5, 15.5], ['flores', 20.5, 2.5],
    ['pedra', 10.5, 13.5], ['pedra', 25.5, 9.5], ['arbusto', 16.5, 14.5], ['arbusto', 28.5, 20.5], ['placa', 11.5, 8.5],
  ]),
};

// ---------- Mundo 3 · Laboratório de Robótica ----------
const LABORATORIO = {
  id: '3-11', mundo: 'robotica', modo: 'iso', nome: 'Laboratório de Robótica', coracoes: 3,
  dica: 'Liguem o painel de cores, levem a peça até o alto e movam a esteira. Depois, montem a ponte até o robô gigante!',
  mapa: desenhar(32, 24, [
    ['#', 11, 1, 11, 13], ['#', 20, 1, 20, 13],            // paredes da sala do robô
    ['1', 12, 1, 19, 6], ['~', 12, 7, 19, 10],             // palco do robô e o fosso
    ['#', 12, 13, 19, 13], ['0', 14, 13, 17, 13],          // portão da sala do robô
    ['#', 1, 9, 10, 9], ['0', 4, 9, 6, 9], ['#', 1, 10, 3, 10], // sala do painel (portão embaixo)
    ['#', 1, 11, 1, 14], ['b', 3, 11, 9, 11], ['r', 3, 12, 9, 12], ['y', 3, 13, 9, 13], ['g', 3, 14, 9, 14], ['#', 1, 15, 9, 15],
    ['2', 22, 1, 30, 5], ['#', 27, 1, 27, 5], ['2', 27, 3],  // bancada alta (elevador ao lado)
    ['#', 23, 18, 23, 22], ['#', 24, 18, 30, 18], ['0', 27, 18, 28, 18], // depósito da esteira
  ]),
  personagens: [{ id: 'ruivo', x: 14.5, z: 20.5 }, { id: 'loira', x: 15.5, z: 20.5 }, { id: 'cacheado', x: 16.5, z: 20.5 }, { id: 'sapo', x: 17.5, z: 20.5 }],
  missoes: [
    { id: 'm1', nome: 'O painel de cores', x: 5.5, z: 4.5, icone: 'engrenagem',
      passos: [
        { texto: 'Cada time entra na faixa da SUA cor e puxa a alavanca no fim (✋ AÇÃO). Precisa de todas!', feito: { alavancas: TODAS } },
        { texto: 'Painel ligado! O portão abriu: toquem a bandeira 1.', feito: { missao: 'm1' } },
      ] },
    { id: 'm2', nome: 'A peça do robô', x: 29.5, z: 2.5, icone: 'robozinho',
      passos: [
        { texto: 'Um time pega a peça (bloco branco, ✋ AÇÃO) e espera no elevador. O outro pisa na placa para subir.', alvo: [28.5, 10.5], feito: { placa: 'placa2' } },
        { texto: 'Lá em cima, joguem a peça no encaixe com a seta (✋ AÇÃO).', alvo: [23.5, 3.5], feito: { encaixe: 'enc2' } },
        { texto: 'O portão da bancada abriu! Toquem a bandeira 2.', feito: { missao: 'm2' } },
      ] },
    { id: 'm3', nome: 'A esteira pesada', x: 27.5, z: 20.5, icone: 'bloco',
      passos: [
        { texto: 'Dois times ficam atrás da caixa pesada e empurram juntos para a ESQUERDA até a placa.', alvo: [30.5, 16.5], feito: { placa: 'placa3' } },
        { texto: 'O portão do depósito abriu! Toquem a bandeira 3.', feito: { missao: 'm3' } },
      ] },
    { id: 'm4', nome: 'O robô gigante', x: 16, z: 3.5, icone: 'trofeu', todos: true, final: true, depois: ['m1', 'm2', 'm3'],
      passos: [
        { texto: 'A sala do robô abriu! TODOS os times seguram ✋ AÇÃO juntos para montar a ponte sobre o fosso.', alvo: [16, 11.6], feito: { obra: 'ponte' } },
        { texto: 'Atravessem, pulem no palco e fiquem TODOS juntos perto do robô gigante.', feito: { missao: 'm4' } },
      ] },
  ],
  gemas: [
    ...bandeiras([[8.5, 2.5], [24.5, 12.5], [2.5, 20.5], [29.5, 21.5]]),
    ...pecas([[3.5, 6.5], [10.5, 12.5], [5.5, 17.5], [12.5, 19.5], [20.5, 16.5], [22.5, 10.5], [26.5, 7.5], [30.5, 12.5],
              [24.5, 2.5], [21.5, 1.5], [25.5, 20.5], [9.5, 21.5], [13.5, 2.5], [18.5, 2.5]]),
  ],
  obras: [{ id: 'ponte', x: 14, z: 7, w: 4, d: 4, times: 'todos', tempo: 3 }],
  caixas: [{ id: 'caixa', x: 29.5, z: 16.5, peso: 2, direcoes: ['oeste'] }],
  botoes: [{ id: 'placa2', x: 23.5, z: 8.5 }, { id: 'placa3', x: 25.5, z: 16.5 }],
  alavancas: alavancasCores([[2.5, 11.5], [2.5, 12.5], [2.5, 13.5], [2.5, 14.5]], { fx: 0.8, fz: 0 }),
  blocos: [{ id: 'bloco', x: 28.5, z: 10.5 }],
  encaixes: [{ id: 'enc2', x: 24.5, z: 3.5 }],
  plataformas: [
    { id: 'portao1', tipo: 'portao', x: 4, z: 9, w: 3, d: 1, y0: 3, y1: 0, gatilhos: TODAS, modo: 'e', vel: 5 },
    { id: 'elevador', tipo: 'elevador', x: 21, z: 5, w: 1, d: 1, y0: 0, y1: 2, gatilhos: ['placa2'], vel: 1.6 },
    { id: 'portao2', tipo: 'portao', x: 27, z: 3, w: 1, d: 1, y0: 4, y1: 2, gatilhos: ['enc2'], vel: 5 },
    { id: 'portao3', tipo: 'portao', x: 27, z: 18, w: 2, d: 1, y0: 3, y1: 0, gatilhos: ['placa3'], vel: 5 },
    { id: 'portao4', tipo: 'portao', x: 14, z: 13, w: 4, d: 1, y0: 3, y1: 0, gatilhos: ['m1', 'm2', 'm3'], modo: 'e', vel: 3 },
    { id: 'ponte_fosso', tipo: 'ponte', x: 14, z: 7, w: 4, d: 4, y0: null, y1: 0, gatilhos: ['ponte'] },
  ],
  enfeites: enfeites([
    ['robo', 16, 2.5], ['engrenagem', 13.5, 4.5], ['engrenagem', 18.5, 4.5], ['antena', 2.5, 2.5], ['antena', 9.5, 7.5],
    ['mesa', 25.5, 11.5], ['mesa', 21.5, 21.5], ['engrenagem', 29.5, 13.5], ['robo', 6.5, 20.5], ['antena', 30.5, 7.5],
  ]),
};

// ---------- Mundo 4 · Pista da Gincana ----------
const PISTA = {
  id: '4-11', mundo: 'gincana', modo: 'iso', nome: 'Pista da Gincana', coracoes: 3,
  dica: 'Ponte em dupla, cada time na sua ponta e cabo de guerra. No fim, todos no pódio!',
  mapa: desenhar(34, 22, [
    ['~', 6, 1, 9, 12],                                    // lago do revezamento
    ['#', 1, 13, 6, 13], ['#', 6, 14, 6, 20], ['0', 6, 17, 6, 18], // sala do cabo de guerra (portão à direita)
    ['#', 12, 1, 12, 7], ['#', 21, 1, 21, 7], ['#', 12, 7, 21, 7], ['0', 15, 7, 18, 7], ['3', 14, 1, 19, 3], // pódio
    ['#', 25, 1, 25, 6], ['#', 25, 6, 32, 6], ['0', 28, 6, 29, 6], // sala das cores
    ['#', 30, 8, 32, 8], ['b', 30, 9, 31, 9], ['#', 30, 10, 32, 10], // cantinho azul
    ['#', 30, 12, 32, 12], ['r', 30, 13, 31, 13], ['#', 30, 14, 32, 14], // cantinho rosa
    ['#', 30, 16, 32, 16], ['y', 30, 17, 31, 17], ['#', 30, 18, 32, 18], // cantinho amarelo
    ['#', 26, 18, 26, 20], ['#', 28, 18, 28, 20], ['g', 27, 18, 27, 19], // cantinho verde
    ['T', 23, 14], ['T', 10, 19], ['T', 22, 10], ['T', 3, 1],
  ]),
  personagens: [{ id: 'ruivo', x: 16.5, z: 18.5 }, { id: 'loira', x: 17.5, z: 18.5 }, { id: 'cacheado', x: 18.5, z: 18.5 }, { id: 'sapo', x: 19.5, z: 18.5 }],
  missoes: [
    { id: 'm1', nome: 'Revezamento da ponte', x: 2.5, z: 4.5, icone: 'mapa',
      passos: [
        { texto: 'Dois times seguram ✋ AÇÃO juntos na beira do lago para montar a ponte.', alvo: [10.5, 8.6], feito: { obra: 'ponte' } },
        { texto: 'A ponte ficou pronta! Atravessem e toquem a bandeira 1.', feito: { missao: 'm1' } },
      ] },
    { id: 'm2', nome: 'Cada time na sua ponta', x: 29.5, z: 3.5, icone: 'cone',
      passos: [
        { texto: 'Cada time vai até o cantinho da SUA cor e puxa a alavanca (✋ AÇÃO). Precisa de todas!', feito: { alavancas: TODAS } },
        { texto: 'Todas puxadas! O portão abriu: toquem a bandeira 2.', feito: { missao: 'm2' } },
      ] },
    { id: 'm3', nome: 'Cabo de guerra', x: 2.5, z: 17.5, icone: 'bandeirinha',
      passos: [
        { texto: 'Dois times ficam atrás da caixa pesada e empurram juntos para a ESQUERDA até a placa.', alvo: [13.5, 17.5], feito: { placa: 'placa3' } },
        { texto: 'O portão abriu! Toquem a bandeira 3.', feito: { missao: 'm3' } },
      ] },
    { id: 'm4', nome: 'O pódio', x: 17, z: 2.5, icone: 'trofeu', todos: true, final: true, depois: ['m1', 'm2', 'm3'],
      passos: [
        { texto: 'O portão do pódio abriu! TODOS os times seguram ✋ AÇÃO juntos para montar os degraus.', alvo: [17, 7.6], feito: { obra: 'podio' } },
        { texto: 'Subam no pódio e fiquem TODOS juntos perto do troféu.', feito: { missao: 'm4' } },
      ] },
  ],
  gemas: [
    ...bandeiras([[4.5, 9.5], [27.5, 2.5], [3.5, 19.5], [24.5, 19.5]]),
    ...pecas([[1.5, 1.5], [10.5, 3.5], [11.5, 14.5], [14.5, 11.5], [20.5, 13.5], [23.5, 4.5], [27.5, 9.5], [28.5, 15.5],
              [22.5, 20.5], [8.5, 20.5], [13.5, 4.5], [20.5, 4.5], [31.5, 2.5], [17.5, 15.5]]),
  ],
  obras: [
    { id: 'ponte', x: 6, z: 8, w: 4, d: 2, times: 2, tempo: 3 },
    { id: 'podio', x: 15, z: 4, w: 4, d: 2, times: 'todos', tempo: 3 },
  ],
  caixas: [{ id: 'caixa', x: 12.5, z: 17.5, peso: 2, direcoes: ['oeste'] }],
  botoes: [{ id: 'placa3', x: 8.5, z: 17.5 }],
  alavancas: [
    { id: 'al_azul', cor: 'azul', x: 32.5, z: 9.5, fx: -0.8, fz: 0 }, { id: 'al_rosa', cor: 'rosa', x: 32.5, z: 13.5, fx: -0.8, fz: 0 },
    { id: 'al_amarelo', cor: 'amarelo', x: 32.5, z: 17.5, fx: -0.8, fz: 0 }, { id: 'al_verde', cor: 'verde', x: 27.5, z: 20.5, fx: 0, fz: -0.8 },
  ],
  blocos: [],
  encaixes: [],
  plataformas: [
    { id: 'ponte_lago', tipo: 'ponte', x: 6, z: 8, w: 4, d: 2, y0: null, y1: 0, gatilhos: ['ponte'] },
    { id: 'portao2', tipo: 'portao', x: 28, z: 6, w: 2, d: 1, y0: 3, y1: 0, gatilhos: TODAS, modo: 'e', vel: 5 },
    { id: 'portao3', tipo: 'portao', x: 6, z: 17, w: 1, d: 2, y0: 3, y1: 0, gatilhos: ['placa3'], vel: 5 },
    { id: 'portao4', tipo: 'portao', x: 15, z: 7, w: 4, d: 1, y0: 3, y1: 0, gatilhos: ['m1', 'm2', 'm3'], modo: 'e', vel: 3 },
    { id: 'degrau1', tipo: 'degrau', x: 15, z: 5, w: 4, d: 1, y0: 0, y1: 1, gatilhos: ['podio'], vel: 1.5 },
    { id: 'degrau2', tipo: 'degrau', x: 15, z: 4, w: 4, d: 1, y0: 0, y1: 2, gatilhos: ['podio'], vel: 1.5 },
  ],
  enfeites: enfeites([
    ['cone', 14.5, 9.5], ['cone', 19.5, 9.5], ['cone', 14.5, 14.5], ['cone', 19.5, 14.5], ['bandeirola', 17, 12],
    ['bandeirola', 26.5, 11.5], ['cone', 10.5, 16.5], ['trofeu', 17, 1.6], ['flores', 1.5, 11.5], ['arbusto', 24.5, 8.5],
  ]),
};

// ---------- Mundo 5 · Estádio das Conquistas ----------
const ESTADIO = {
  id: '5-11', mundo: 'conquistas', modo: 'iso', nome: 'Estádio das Conquistas', coracoes: 3,
  dica: 'Quatro desafios em volta do estádio. Com todos cumpridos, a torre do pódio espera a equipe inteira!',
  mapa: desenhar(36, 24, [
    ['#', 12, 5, 23, 18], ['0', 13, 6, 22, 17], ['0', 16, 18, 19, 18], ['3', 16, 7, 19, 9], // estádio e torre
    ['#', 12, 1, 12, 4],
    ['#', 1, 1, 9, 9], ['b', 2, 2, 2, 9], ['r', 4, 2, 4, 9], ['y', 6, 2, 6, 9], ['g', 8, 2, 8, 9], // faixas coloridas
    ['0', 2, 1], ['0', 4, 1], ['0', 6, 1], ['0', 8, 1],     // alavancas no fim das faixas
    ['#', 1, 11, 7, 11], ['~', 7, 12, 10, 22],             // lago e prado da ponte
    ['#', 30, 1, 30, 4], ['#', 30, 4, 34, 4], ['0', 32, 4, 33, 4], // sala do peso
    ['2', 30, 15, 34, 22], ['#', 32, 15, 32, 22], ['2', 32, 18], // platô da taça (elevador ao lado)
    ['T', 25, 9], ['T', 34, 10], ['T', 14, 2], ['T', 24, 21],
  ]),
  personagens: [{ id: 'ruivo', x: 16.5, z: 20.5 }, { id: 'loira', x: 17.5, z: 20.5 }, { id: 'cacheado', x: 18.5, z: 20.5 }, { id: 'sapo', x: 19.5, z: 20.5 }],
  missoes: [
    { id: 'm1', nome: 'As quatro cores', x: 10.5, z: 2.5, icone: 'bandeirinha',
      passos: [
        { texto: 'Cada time entra na faixa da SUA cor e puxa a alavanca lá no fim (✋ AÇÃO). Precisa de todas!', feito: { alavancas: TODAS } },
        { texto: 'Todas puxadas! O portão abriu: toquem a bandeira 1.', feito: { missao: 'm1' } },
      ] },
    { id: 'm2', nome: 'Levantamento de peso', x: 32.5, z: 2, icone: 'medalha',
      passos: [
        { texto: 'Dois times ficam atrás da caixa pesada e empurram juntos para CIMA até a placa.', alvo: [28.5, 11.6], feito: { placa: 'placa2' } },
        { texto: 'O portão abriu! Toquem a bandeira 2.', feito: { missao: 'm2' } },
      ] },
    { id: 'm3', nome: 'A taça no alto', x: 33.5, z: 18.5, icone: 'engrenagem',
      passos: [
        { texto: 'Um time pega o bloco branco (✋ AÇÃO) e espera no elevador. O outro pisa na placa para subir.', alvo: [25.5, 20.5], feito: { placa: 'placa3' } },
        { texto: 'Lá em cima, joguem o bloco no encaixe com a seta (✋ AÇÃO).', alvo: [31.5, 17.5], feito: { encaixe: 'enc3' } },
        { texto: 'O portão do platô abriu! Toquem a bandeira 3.', feito: { missao: 'm3' } },
      ] },
    { id: 'm4', nome: 'Ponte dos campeões', x: 3.5, z: 16.5, icone: 'mapa',
      passos: [
        { texto: 'Dois times seguram ✋ AÇÃO juntos na beira do lago para montar a ponte.', alvo: [11.5, 16.6], feito: { obra: 'ponte' } },
        { texto: 'A ponte ficou pronta! Atravessem e toquem a bandeira 4.', feito: { missao: 'm4' } },
      ] },
    { id: 'm5', nome: 'Pódio dos campeões', x: 18, z: 8, icone: 'trofeu', todos: true, final: true, depois: ['m1', 'm2', 'm3', 'm4'],
      passos: [
        { texto: 'O estádio abriu! TODOS os times seguram ✋ AÇÃO juntos para montar a escada da torre.', alvo: [18, 12.6], feito: { obra: 'torre' } },
        { texto: 'Subam a torre pulando e fiquem TODOS juntos perto do troféu.', feito: { missao: 'm5' } },
      ] },
  ],
  gemas: [
    ...bandeiras([[10.5, 7.5], [33.5, 1.5], [33.5, 21.5], [1.5, 21.5]]),
    ...pecas([[3.5, 10.5], [11.5, 13.5], [14.5, 20.5], [21.5, 21.5], [26.5, 14.5], [27.5, 7.5], [34.5, 7.5], [24.5, 2.5],
              [20.5, 2.5], [15.5, 3.5], [14.5, 14.5], [21.5, 14.5], [3.5, 13.5], [30.5, 12.5]]),
  ],
  obras: [
    { id: 'ponte', x: 7, z: 16, w: 4, d: 2, times: 2, tempo: 3 },
    { id: 'torre', x: 16, z: 10, w: 4, d: 2, times: 'todos', tempo: 3 },
  ],
  caixas: [{ id: 'caixa', x: 28.5, z: 10.5, peso: 2, direcoes: ['norte'] }],
  botoes: [{ id: 'placa2', x: 28.5, z: 6.5 }, { id: 'placa3', x: 26.5, z: 14.5 }],
  alavancas: alavancasCores([[2.5, 1.5], [4.5, 1.5], [6.5, 1.5], [8.5, 1.5]], { fx: 0, fz: 0.8 }),
  blocos: [{ id: 'bloco', x: 25.5, z: 20.5 }],
  encaixes: [{ id: 'enc3', x: 31.5, z: 16.5 }],
  plataformas: [
    { id: 'portao1', tipo: 'portao', x: 10, z: 5, w: 2, d: 1, y0: 3, y1: 0, gatilhos: TODAS, modo: 'e', vel: 5 },
    { id: 'portao2', tipo: 'portao', x: 32, z: 4, w: 2, d: 1, y0: 3, y1: 0, gatilhos: ['placa2'], vel: 5 },
    { id: 'elevador', tipo: 'elevador', x: 29, z: 17, w: 1, d: 1, y0: 0, y1: 2, gatilhos: ['placa3'], vel: 1.6 },
    { id: 'portao3', tipo: 'portao', x: 32, z: 18, w: 1, d: 1, y0: 4, y1: 2, gatilhos: ['enc3'], vel: 5 },
    { id: 'ponte_lago', tipo: 'ponte', x: 7, z: 16, w: 4, d: 2, y0: null, y1: 0, gatilhos: ['ponte'] },
    { id: 'portao5', tipo: 'portao', x: 16, z: 18, w: 4, d: 1, y0: 3, y1: 0, gatilhos: ['m1', 'm2', 'm3', 'm4'], modo: 'e', vel: 3 },
    { id: 'degrau1', tipo: 'degrau', x: 16, z: 11, w: 4, d: 1, y0: 0, y1: 1, gatilhos: ['torre'], vel: 1.5 },
    { id: 'degrau2', tipo: 'degrau', x: 16, z: 10, w: 4, d: 1, y0: 0, y1: 2, gatilhos: ['torre'], vel: 1.5 },
  ],
  enfeites: enfeites([
    ['trofeu', 18, 7.4], ['estrela', 14.5, 7.5], ['estrela', 21.5, 7.5], ['bandeirola', 14.5, 15.5], ['bandeirola', 21.5, 15.5],
    ['podio', 33.5, 20.5], ['medalha', 26.5, 2.5], ['cone', 28.5, 12.5], ['flores', 3.5, 19.5], ['estrela', 24.5, 16.5],
  ]),
};

// Mundo 2: o canteiro já existente vira a 11ª fase do mundo.
const CANTEIRO = { ...FASES_MUNDO2[0], id: '2-11' };

export const FASES_3D = { exploradores: ACAMPAMENTO, construtores: CANTEIRO, robotica: LABORATORIO, gincana: PISTA, conquistas: ESTADIO };
