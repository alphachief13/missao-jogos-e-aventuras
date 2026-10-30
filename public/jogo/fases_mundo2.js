// Mundo 2 · Desafio dos Construtores. Mapa isométrico aberto com 5 missões espalhadas (ver sim_iso.js).
// Coordenadas: x = coluna, z = linha; objetos no centro do tile (c + 0.5, l + 0.5).
// Plataformas (portões, elevadores, pontes, degraus) cobrem um retângulo de tiles e mudam de altura:
// y0 quando os gatilhos estão desligados, y1 quando ligados (null = não existe ainda).
// Gatilhos podem ser placas, alavancas, obras, encaixes ou missões. modo 'e' = todos ligados.
// Tudo funciona com 2, 3 ou 4 times (chão e alavancas de times ausentes ficam livres).

const pecas = lista => lista.map(([x, z, y]) => ({ cor: 'peca', x, z, ...(y !== undefined && { y }) }));

export const FASES_MUNDO2 = [
  {
    id: '2-1', mundo: 'construtores', modo: 'iso', nome: 'Canteiro dos Construtores', coracoes: 3,
    dica: 'Explorem o canteiro e completem as 4 missões. Depois, a grande torre!',
    mapa: [
      '####################################',
      '#0000000000#000000000000#0000000000#',
      '#0000000000#000333333000#0000000000#',
      '#0000000000#000333333000#0000000000#',
      '#0000000000#000333333000#0000000000#',
      '#~~~~~~~~~~#000000000000#0000000000#',
      '#~~~~~~~~~~#000000000000#0000000000#',
      '#~~~~~~~~~~#000000000000#######00###',
      '#~~~~~~~~~~#000000000000#0000000000#',
      '#~~~~~~~~~~#####0000#####0###000000#',
      '#0000000000000000000000000#0#000000#',
      '#0000000000000000000000000#0#000T00#',
      '#0T0000000000T00000000T000#0#000000#',
      '#000000000000000000~~00000#0#000000#',
      '#00000000T000000000~~00000#0#000000#',
      '#0000000000000T00000000T0001000T000#',
      '#0000000000000000000000000000000000#',
      '#0000000000000000000000000000000000#',
      '##############00000000#######000000#',
      '##0#0#0#0#000#00000000#00000#222222#',
      '##0#0#0#0#000#00000000#00000#222222#',
      '##b#r#y#g#000#00000000#00000#222222#',
      '##b#r#y#g#000#00000000#00000#222222#',
      '##b#r#y#g#000#00000000##00###222222#',
      '##b#r#y#g#000#000000000000000000000#',
      '##0#0#0#0#000#000000000000000000000#',
      '#00000000000000000000000000000000T0#',
      '#00T0000000T0000T0000T0000000000000#',
      '#0000000000000000000000000000000000#',
      '####################################',
    ],
    personagens: [
      { id: 'ruivo', x: 16.5, z: 22.5 },
      { id: 'loira', x: 17.5, z: 22.5 },
      { id: 'cacheado', x: 18.5, z: 22.5 },
      { id: 'sapo', x: 19.5, z: 22.5 },
    ],
    missoes: [
      { id: 'm1', nome: 'A ponte do rio', x: 5.5, z: 2.5, icone: 'mapa',
        dica: 'Dois times seguram AÇÃO juntos na obra para montar a ponte.' },
      { id: 'm2', nome: 'A caixa pesada', x: 30.5, z: 3.5, icone: 'bloco',
        dica: 'A caixa é pesada: empurrem em dupla até a placa para abrir o portão.' },
      { id: 'm3', nome: 'Caminho das cores', x: 11.5, z: 20.5, icone: 'bussola',
        dica: 'Cada time passa no chão da sua cor e puxa a sua alavanca.' },
      { id: 'm4', nome: 'O elevador', x: 25.5, z: 20.5, icone: 'engrenagem',
        dica: 'Um time segura a placa; o outro sobe no elevador com o bloco e coloca no encaixe.' },
      { id: 'm5', nome: 'A grande torre', x: 18, z: 3.5, icone: 'trofeu', todos: true, final: true,
        depois: ['m1', 'm2', 'm3', 'm4'],
        dica: 'Todos os times seguram AÇÃO juntos para montar a escada. Subam todos juntos!' },
    ],
    gemas: [
      { cor: 'azul', x: 2.5, z: 2.5 }, { cor: 'rosa', x: 33.5, z: 2.5 },
      { cor: 'amarelo', x: 11.5, z: 23.5 }, { cor: 'verde', x: 32.5, z: 22.5 },
      ...pecas([[8.5, 12.5], [15.5, 16.5], [20.5, 16.5], [30.5, 11.5], [33.5, 13.5], [17.5, 25.5], [5.5, 27.5],
                [10.5, 27.5], [28.5, 26.5], [33.5, 28.5], [13.5, 6.5], [22.5, 6.5], [1.5, 13.5], [16.5, 2.5]]),
    ],
    // Missão 1: obra da ponte (2 times)
    obras: [
      { id: 'ponte', x: 5, z: 5, w: 2, d: 5, times: 2, tempo: 3 },
      { id: 'escada', x: 16, z: 5, w: 4, d: 3, times: 'todos', tempo: 3 },
    ],
    // Missão 2: caixa pesada até a placa
    caixas: [{ id: 'caixa', x: 27.5, z: 13.5, peso: 2 }],
    botoes: [
      { id: 'placa2', x: 27.5, z: 10.5 },
      { id: 'placa4', x: 24.5, z: 26.5 },
    ],
    // Missão 3: alavancas no fim de cada corredor colorido
    alavancas: [
      { id: 'al_azul', cor: 'azul', x: 2.5, z: 19.5 },
      { id: 'al_rosa', cor: 'rosa', x: 4.5, z: 19.5 },
      { id: 'al_amarelo', cor: 'amarelo', x: 6.5, z: 19.5 },
      { id: 'al_verde', cor: 'verde', x: 8.5, z: 19.5 },
    ],
    // Missão 4: bloco no encaixe do planalto
    blocos: [{ id: 'bloco', x: 26.5, z: 27.5 }],
    encaixes: [{ id: 'encaixe4', x: 33.5, z: 20.5 }],
    plataformas: [
      { id: 'ponte_rio', tipo: 'ponte', x: 5, z: 5, w: 2, d: 5, y0: null, y1: 0, gatilhos: ['ponte'] },
      { id: 'portao2', tipo: 'portao', x: 31, z: 7, w: 2, d: 1, y0: 3, y1: 0, gatilhos: ['placa2'], vel: 5 },
      { id: 'portao3', tipo: 'portao', x: 10, z: 25, w: 3, d: 1, y0: 3, y1: 0,
        gatilhos: ['al_azul', 'al_rosa', 'al_amarelo', 'al_verde'], modo: 'e', vel: 5 },
      { id: 'elevador', tipo: 'elevador', x: 31, z: 24, w: 1, d: 1, y0: 0, y1: 2, gatilhos: ['placa4'], vel: 1.6 },
      { id: 'portao4', tipo: 'portao', x: 24, z: 23, w: 2, d: 1, y0: 3, y1: 0, gatilhos: ['encaixe4'], vel: 5 },
      { id: 'portao5', tipo: 'portao', x: 16, z: 9, w: 4, d: 1, y0: 3, y1: 0, gatilhos: ['m1', 'm2', 'm3', 'm4'], modo: 'e', vel: 3 },
      { id: 'degrau1', tipo: 'degrau', x: 16, z: 7, w: 4, d: 1, y0: 0, y1: 1, gatilhos: ['escada'], vel: 1.5 },
      { id: 'degrau2', tipo: 'degrau', x: 16, z: 6, w: 4, d: 1, y0: 0, y1: 2, gatilhos: ['escada'], vel: 1.5 },
      { id: 'degrau3', tipo: 'degrau', x: 16, z: 5, w: 4, d: 1, y0: 0, y1: 3, gatilhos: ['escada'], vel: 1.5 },
    ],
    // Enfeites sem colisão (sprites do Codex; enquanto não existem, formas simples em 3D)
    enfeites: [
      { tipo: 'guindaste', x: 12.5, z: 15.5 }, { tipo: 'pilha_blocos', x: 21.5, z: 19.5 },
      { tipo: 'pilha_blocos', x: 14.5, z: 7.5 }, { tipo: 'cone', x: 15.5, z: 10.5 }, { tipo: 'cone', x: 20.5, z: 10.5 },
      { tipo: 'carrinho', x: 24.5, z: 16.5 }, { tipo: 'flores', x: 3.5, z: 15.5 }, { tipo: 'flores', x: 7.5, z: 2.5 },
      { tipo: 'flores', x: 26.5, z: 2.5 }, { tipo: 'flores', x: 14.5, z: 26.5 }, { tipo: 'arbusto', x: 6.5, z: 16.5 },
      { tipo: 'arbusto', x: 29.5, z: 16.5 }, { tipo: 'pedra', x: 10.5, z: 11.5 }, { tipo: 'pedra', x: 34.5, z: 9.5 },
    ],
  },
];
