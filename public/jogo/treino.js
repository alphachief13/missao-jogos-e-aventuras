// Treino jogável do modo plataforma: uma fase curta em que cada habilidade é um objetivo na tela.
// O objetivo só avança quando alguém faz de verdade (andar, pular, pegar a bandeirinha, atravessar as poças,
// subir no elevador, pular o curto-circuito, puxar a alavanca e entrar no arco). Corações não acabam no treino.
//
// Percurso: chão de baixo da esquerda para a direita (degrau, poças de cada cor), elevador automático
// na direita, e o andar de cima da direita para a esquerda (curto-circuito, alavanca + portão, arcos).

export const FASE_TREINO = {
  id: 'Treino', mundo: 'exploradores', nome: 'Aprendendo a jogar', coracoes: 5, treino: true,
  dica: 'Siga os objetivos que aparecem embaixo da tela!',
  mapa: [
    '########################',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#################xx##..#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#...#..................#',
    '######bb##rr##yy##gg####',
  ],
  personagens: [
    { id: 'ruivo', x: 1.5, y: 13 }, { id: 'loira', x: 1.95, y: 13 },
    { id: 'cacheado', x: 2.4, y: 13 }, { id: 'sapo', x: 2.85, y: 13 },
  ],
  portais: [['azul', 2.6], ['rosa', 4.5], ['amarelo', 6.4], ['verde', 8.3]].map(([cor, x]) => ({ cor, x, y: 7 })),
  gemas: [
    { cor: 'azul', x: 4.15, y: 10.6 }, { cor: 'rosa', x: 4.4, y: 10.6 },
    { cor: 'amarelo', x: 4.65, y: 10.6 }, { cor: 'verde', x: 4.9, y: 10.6 },
    ...[[5.5, 12.4], [8.9, 12], [12.9, 12], [16.9, 12], [22, 9.5], [19.9, 6.4], [17.9, 5.4], [13, 6.4], [10, 6.4]]
      .map(([x, y]) => ({ cor: 'peca', x, y })),
  ],
  alavancas: [{ id: 'a1', x: 14.5, y: 7 }],
  botoes: [],
  plataformas: [
    { id: 'elev', tipo: 'elevador', x: 21, y: 12.5, x2: 21, y2: 7, w: 2, h: 0.5, modo: 'auto', vel: 2, pausa: 1.6 },
    { id: 'portao', tipo: 'portao', x: 11.5, y: 3, x2: 11.5, y2: -1.2, w: 1, h: 4, gatilhos: ['a1'], modo: 'ou', vel: 4 },
  ],
};

const alguem = (jogo, f) => jogo.personagens.some(p => !p.morto && f(p));
const teve = (eventos, e) => eventos.some(x => x.e === e);

// Cada passo: texto curto (o que fazer), teclas/botões que ajudam e a condição de "feito".
export const PASSOS_TREINO = [
  { texto: 'Ande para a direita', teclas: ['→'], feito: j => alguem(j, p => p.x > 3.4) },
  { texto: 'Pule no degrau e pegue a bandeirinha do seu time', teclas: ['↑'], feito: (j, ev) => teve(ev, 'bandeira') },
  { texto: 'Poças de tinta: só pise na da sua cor. Pule as outras!', teclas: ['↑'], feito: j => alguem(j, p => p.x > 20.2 && p.y > 10) },
  { texto: 'Suba no elevador: ele leva vocês lá para cima', teclas: [], feito: j => alguem(j, p => p.y < 7.6 && p.noChao) },
  { texto: 'Cuidado! A poça com raio derruba todo mundo. Pule por cima!', teclas: ['←', '↑'], feito: j => alguem(j, p => p.y < 7.6 && p.x < 16.6) },
  { texto: 'Perto da alavanca, aperte AÇÃO para abrir o portão', teclas: ['↓'], feito: (j, ev) => teve(ev, 'alavanca') },
  { texto: 'Agora todos no arco da sua cor!', teclas: [], feito: j => j.resultado === 'vitoria' },
];

// ---------- treino do mapa 3D (Mundo 2, modo isométrico) ----------
// Percurso: canto de baixo à esquerda (bloco alto com as bandeirinhas) → faixa de chão colorido →
// pátio do bloco e do encaixe (abre o portão) → pátio da lagoa (cair e ser ajudado) → obra da ponte em equipe
// → troféu do outro lado do rio, onde todos precisam chegar juntos.
export const FASE_TREINO_ISO = {
  id: 'Treino 3D', mundo: 'construtores', modo: 'iso', nome: 'Aprendendo o mapa 3D', coracoes: 3, treino: true,
  dica: 'Siga os objetivos que aparecem em cima da tela!',
  mapa: [
    '##################',
    '#000000~~~~000000#',
    '#000000~~~~000000#',
    '#000000~~~~000000#',
    '#000000~~~~00~~00#',
    '#000000~~~~00~~00#',
    '############00####',
    '##########0000000#',
    '##########0000000#',
    '#00001100b0000000#',
    '#00001100r0000000#',
    '#00000000y0000000#',
    '#00000000g0000000#',
    '##################',
  ],
  personagens: [
    { id: 'ruivo', x: 1.5, z: 11.5 }, { id: 'loira', x: 2.5, z: 11.5 },
    { id: 'cacheado', x: 1.5, z: 12.5 }, { id: 'sapo', x: 2.5, z: 12.5 },
  ],
  missoes: [
    { id: 'trofeu', nome: 'Todos no troféu', x: 3.5, z: 2.5, icone: 'trofeu', todos: true, final: true,
      dica: 'Atravessem a ponte e cheguem todos juntos no troféu.' },
  ],
  gemas: [
    { cor: 'azul', x: 5.5, z: 9.5 }, { cor: 'rosa', x: 6.5, z: 9.5 },
    { cor: 'amarelo', x: 5.5, z: 10.5 }, { cor: 'verde', x: 6.5, z: 10.5 },
    ...[[3.5, 9.5], [13.5, 10.5], [15.5, 11.5], [11.5, 7.5], [15.5, 2.5], [12.5, 1.5], [1.5, 4.5], [5.5, 1.5]]
      .map(([x, z]) => ({ cor: 'peca', x, z })),
  ],
  obras: [{ id: 'ponte', x: 7, z: 2, w: 4, d: 2, times: 2, tempo: 3 }],
  caixas: [],
  botoes: [],
  alavancas: [],
  blocos: [{ id: 'bloco', x: 11.5, z: 11.5 }],
  encaixes: [{ id: 'encaixe', x: 15.5, z: 8.5 }],
  plataformas: [
    { id: 'portao', tipo: 'portao', x: 12, z: 6, w: 2, d: 1, y0: 3, y1: 0, gatilhos: ['encaixe'], vel: 5 },
    { id: 'ponte_rio', tipo: 'ponte', x: 7, z: 2, w: 4, d: 2, y0: null, y1: 0, gatilhos: ['ponte'] },
  ],
  enfeites: [
    { tipo: 'flores', x: 3.5, z: 12.5 }, { tipo: 'cone', x: 10.5, z: 9.5 }, { tipo: 'pilha_blocos', x: 16.5, z: 12.5 },
    { tipo: 'arbusto', x: 16.5, z: 1.5 }, { tipo: 'flores', x: 1.5, z: 1.5 },
  ],
};

const algumIso = (jogo, f) => jogo.personagens.some(p => !p.caido && f(p));

export const PASSOS_TREINO_ISO = [
  { texto: 'Ande pelo mapa para todos os lados', teclas: ['↑', '↓', '←', '→'], feito: j => algumIso(j, p => p.x > 3.8 || p.z < 10.2) },
  { texto: 'Pule no bloco alto e pegue a bandeirinha do seu time', teclas: ['Espaço'], feito: (j, ev) => teve(ev, 'bandeira') },
  { texto: 'Chão colorido: passe pela faixa da sua cor', teclas: [], feito: j => algumIso(j, p => p.x > 10 && p.z > 6.9) },
  { texto: 'Chegue perto do bloco e aperte AÇÃO para pegar', teclas: ['E'], feito: (j, ev) => teve(ev, 'pegar') },
  { texto: 'Vire para o encaixe e aperte AÇÃO de novo para jogar o bloco', teclas: ['E'], feito: (j, ev) => teve(ev, 'encaixe') },
  { texto: 'O portão abriu! Agora pule na lagoa, de propósito', teclas: ['↑'], feito: (j, ev) => teve(ev, 'caiu') },
  { texto: 'Caiu? Um amigo chega perto e aperta AÇÃO para levantar', teclas: ['E'], feito: (j, ev) => teve(ev, 'ajudou') || teve(ev, 'levantou') },
  { texto: 'Obra em equipe: segurem AÇÃO juntos perto do rio', teclas: ['E'], feito: (j, ev) => teve(ev, 'construir') },
  { texto: 'Atravessem a ponte e cheguem todos juntos no troféu!', teclas: [], feito: j => j.resultado === 'vitoria' },
];

// Os dois treinos, pelo modo de jogo.
export const TREINOS = {
  lado: { fase: FASE_TREINO, passos: PASSOS_TREINO },
  iso: { fase: FASE_TREINO_ISO, passos: PASSOS_TREINO_ISO },
};
