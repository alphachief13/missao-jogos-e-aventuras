// Uma sala por partida, rodando no navegador da tela (anfitrião): lobby → oficina (loja) → contagem → jogando → fim → loja → ...
// Não depende do transporte: cada cliente é uma função enviar(texto) (canal local ou WebRTC).
// Cada jogador é um time (1 personagem). Sozinho, o jogador leva 2 personagens: mínimo de 2 times, máximo de 4.
import { Jogo, COR_DO_PERSONAGEM } from './sim.js';
import { FASES } from './fases.js';

const PERSONAGENS = ['ruivo', 'loira', 'cacheado', 'sapo'];
const MAX_JOGADORES = 4;
const MIN_TIMES = 2;
const TICK = 1 / 60;
const ENVIO_A_CADA = 2; // 30 estados por segundo
export const LOJA = {
  coracao: { nome: 'Coração extra', preco: 3, max: 2 },
  mola: { nome: 'Tênis de mola', preco: 5, max: 1 },
  planador: { nome: 'Planador', preco: 6, max: 1 },
};

export class Sala {
  constructor() {
    this.clientes = new Set();
    this.jogadores = [];
    this.estado = 'lobby';
    this.faseIdx = 0;
    this.liberadas = 1;
    this.carteira = 0;
    this.compras = {};      // { azul: { coracao: 1, mola: 1 } } para a próxima fase
    this.ultimoGanho = 0;
    this.jogo = null;
    this.contagemFim = 0;
    this.tick = 0;
    this.proxId = 1;
    // passo fixo de 1/60 s, compensando atrasos do setInterval (navegadores não são pontuais)
    let antes = performance.now(), sobra = 0;
    setInterval(() => {
      const agora = performance.now();
      sobra = Math.min(sobra + (agora - antes) / 1000, TICK * 6);
      antes = agora;
      while (sobra >= TICK) { this.passo(); sobra -= TICK; }
    }, 1000 / 120);
  }

  // Liga um cliente. Devolve { receber(texto), fechar() } para o transporte chamar.
  conectar(enviar) {
    const cli = { enviar, jogador: null };
    this.clientes.add(cli);
    this.enviar(cli, { t: 'oi', ...this.resumo() });
    if (this.jogo) this.enviar(cli, { t: 'fase', fase: this.jogo.fase });
    return {
      receber: raw => {
        let m; try { m = JSON.parse(raw); } catch { return; }
        this.mensagem(cli, m);
      },
      fechar: () => {
        if (!this.clientes.delete(cli)) return;
        if (cli.jogador) this.sair(cli.jogador);
      },
    };
  }

  mensagem(cli, m) {
    const j = cli.jogador;
    switch (m.t) {
      case 'entrar': {
        if (j) return;
        if (this.jogadores.length >= MAX_JOGADORES) return this.enviar(cli, { t: 'cheio' });
        const nome = String(m.nome || '').trim().slice(0, 14) || `Jogador ${this.jogadores.length + 1}`;
        const novo = { id: this.proxId++, nome, tipo: m.tipo === 'celular' ? 'celular' : 'teclado',
                       pref: null, entrada: {}, pers: [], ativo: 0, cli };
        cli.jogador = novo;
        this.jogadores.push(novo);
        this.distribuir();
        this.enviar(cli, { t: 'voce', id: novo.id });
        this.evento({ e: 'entrou', nome });
        this.anunciar();
        break;
      }
      case 'escolher':
        if (!j || !PERSONAGENS.includes(m.pers) || this.jogo) return;
        // Só pega personagem que não seja o principal de outro jogador.
        if (this.jogadores.some(o => o !== j && o.pers[0] === m.pers)) return;
        j.pref = m.pers;
        this.distribuir();
        this.anunciar();
        break;
      case 'entrada':
        if (j) j.entrada = { esq: !!m.esq, dir: !!m.dir, pulo: !!m.pulo, acao: !!m.acao,
                             puloBorda: j.entrada.puloBorda || (!!m.pulo && !j.entrada.pulo),
                             acaoBorda: j.entrada.acaoBorda || (!!m.acao && !j.entrada.acao) };
        break;
      case 'trocar':
        if (j && j.pers.length > 1) {
          j.ativo = (j.ativo + 1) % j.pers.length;
          j.entrada = {};
          this.evento({ e: 'trocar', jogador: j.id });
          this.anunciar();
        }
        break;
      case 'escolherFase':
        if (this.estado === 'lobby' && Number.isInteger(m.idx) && m.idx >= 0 && m.idx < this.liberadas) {
          this.faseIdx = m.idx;
          this.anunciar();
        }
        break;
      case 'loja':     // lobby → loja
        if (this.estado === 'lobby' && this.jogadores.length) { this.estado = 'loja'; this.anunciar(); }
        break;
      case 'continuar': // fim → loja (próxima fase se venceu; a mesma se perdeu)
        if (this.estado !== 'fim') return;
        if (this.jogo.resultado === 'vitoria') {
          if (this.faseIdx === FASES.length - 1) { this.irParaLobby(); this.evento({ e: 'mundoCompleto' }); return; }
          this.faseIdx++;
        }
        this.jogo = null;
        this.estado = 'loja';
        this.distribuir();
        this.anunciar();
        break;
      case 'comprar': this.comprar(m.item, m.cor); break;
      case 'jogar':
        if (this.estado === 'loja') this.iniciar();
        break;
      case 'lobby':
        if (this.estado === 'fim' || this.estado === 'loja') this.irParaLobby();
        break;
    }
  }

  irParaLobby() { this.estado = 'lobby'; this.jogo = null; this.distribuir(); this.anunciar(); }

  comprar(item, cor) {
    const def = LOJA[item];
    if (this.estado !== 'loja' || !def || !this.timesAtivos().includes(cor)) return;
    const c = (this.compras[cor] ??= {});
    if ((c[item] || 0) >= def.max || this.carteira < def.preco) return;
    this.carteira -= def.preco;
    c[item] = (c[item] || 0) + 1;
    this.evento({ e: 'compra', item, cor });
    this.anunciar();
  }

  sair(j) {
    this.jogadores = this.jogadores.filter(x => x !== j);
    this.distribuir();
    if (!this.jogadores.length && this.estado !== 'lobby') this.irParaLobby();
    this.anunciar();
  }

  timesAtivos() {
    const ids = this.jogo ? this.jogo.personagens.map(p => p.id) : this.jogadores.flatMap(j => j.pers);
    return PERSONAGENS.filter(p => ids.includes(p)).map(id => COR_DO_PERSONAGEM[id]);
  }

  // Fora da partida: cada jogador fica com 1 personagem (a escolha dele ou o primeiro livre);
  // sozinho, leva 2. Durante a partida os personagens da fase são fixos, e o de quem saiu passa para quem tem menos.
  distribuir() {
    const ativoAntes = new Map(this.jogadores.map(j => [j, j.pers[j.ativo]]));
    if (this.jogo) {
      const lista = this.jogo.personagens.map(p => p.id);
      for (const j of this.jogadores) j.pers = j.pers.filter(p => lista.includes(p));
      const donos = new Set(this.jogadores.flatMap(j => j.pers));
      for (const p of lista.filter(p => !donos.has(p))) {
        if (!this.jogadores.length) break;
        this.jogadores.reduce((a, b) => (b.pers.length < a.pers.length ? b : a)).pers.push(p);
      }
    } else {
      const livres = new Set(PERSONAGENS);
      for (const j of this.jogadores) j.pers = [];
      for (const j of this.jogadores) if (j.pref && livres.has(j.pref)) { j.pers.push(j.pref); livres.delete(j.pref); }
      for (const j of this.jogadores) if (!j.pers.length) { const p = [...livres][0]; j.pers.push(p); livres.delete(p); }
      while (this.jogadores.length && this.jogadores.flatMap(j => j.pers).length < MIN_TIMES) {
        const p = [...livres][0]; this.jogadores[0].pers.push(p); livres.delete(p);
      }
    }
    for (const j of this.jogadores) {
      const i = j.pers.indexOf(ativoAntes.get(j));
      j.ativo = i >= 0 ? i : 0;
    }
  }

  iniciar() {
    if (!this.jogadores.length) return;
    this.distribuir();
    const ativos = PERSONAGENS.filter(p => this.jogadores.some(j => j.pers.includes(p)));
    this.jogo = new Jogo(FASES[this.faseIdx], this.compras, ativos);
    this.compras = {};
    this.estado = 'contagem';
    this.contagemFim = Date.now() + 3000;
    this.difundir({ t: 'fase', fase: this.jogo.fase });
    this.evento({ e: 'contagem' });
    this.anunciar();
  }

  passo() {
    this.tick++;
    if (this.estado === 'contagem' && Date.now() >= this.contagemFim) { this.estado = 'jogando'; this.anunciar(); }
    if (this.estado === 'jogando') {
      const entradas = {};
      for (const j of this.jogadores) {
        const p = j.pers[j.ativo];
        if (p) entradas[p] = j.entrada;
        j.entrada = { ...j.entrada, puloBorda: false, acaoBorda: false };
      }
      this.jogo.passo(TICK, entradas);
      for (const e of this.jogo.eventos) this.evento(e);
      if (this.jogo.resultado) {
        this.ultimoGanho = this.jogo.pecas;
        this.carteira += this.jogo.pecas;
        if (this.jogo.resultado === 'vitoria') this.liberadas = Math.min(FASES.length, Math.max(this.liberadas, this.faseIdx + 2));
        this.estado = 'fim';
        this.anunciar();
      }
    }
    if (this.jogo && this.tick % ENVIO_A_CADA === 0) this.difundir({ t: 's', ...this.jogo.estado() });
  }

  resumo() {
    return {
      estado: this.estado,
      contagemFim: this.estado === 'contagem' ? this.contagemFim - Date.now() : 0,
      jogadores: this.jogadores.map((j, n) => ({ id: j.id, n: n + 1, nome: j.nome, tipo: j.tipo, pers: j.pers, ativo: j.pers[j.ativo] ?? null })),
      times: this.timesAtivos(),
      resultado: this.jogo?.resultado ?? null,
      placar: this.jogo?.resultado ? this.jogo.placar() : null,
      faseIdx: this.faseIdx,
      liberadas: this.liberadas,
      fases: FASES.map(f => ({ id: f.id, nome: f.nome, coracoes: f.coracoes, dica: f.dica, mundo: f.mundo })),
      carteira: this.carteira,
      ultimoGanho: this.ultimoGanho,
      compras: this.compras,
      loja: LOJA,
      max: MAX_JOGADORES,
    };
  }

  anunciar() { this.difundir({ t: 'sala', ...this.resumo() }); }
  evento(e) { this.difundir({ t: 'ev', ...e }); }
  enviar(cli, m) { cli.enviar(JSON.stringify(m)); }
  difundir(m) { const s = JSON.stringify(m); for (const c of this.clientes) c.enviar(s); }
}
