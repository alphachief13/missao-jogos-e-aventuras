// Efeitos sonoros via Web Audio. O navegador só libera o áudio depois de um clique/tecla.
// Se o arquivo novo ainda não existir, usa o antigo equivalente (ANTIGO) até o Codex gerar os sons novos.
const NOMES = ['pulo', 'pouso', 'bandeira', 'peca', 'alavanca', 'botao', 'chegada', 'perdeu_coracao', 'derrota', 'vitoria',
               'clique', 'trocar', 'entrou', 'contagem', 'compra'];
const ANTIGO = { bandeira: 'gema', peca: 'estrela_xp', chegada: 'portal_abre', perdeu_coracao: 'derrota', clique: 'clique_ui',
                 trocar: 'trocar_personagem', entrou: 'jogador_entrou', contagem: 'contagem_regressiva', compra: 'gema' };
const VOLUME = { pulo: 0.35, pouso: 0.25, botao: 0.6, clique: 0.5, peca: 0.6 };

let ctx = null;
const buffers = {};
let mudo = false;

async function carregar(nome) {
  for (const arq of [nome, ANTIGO[nome]].filter(Boolean)) {
    try {
      const r = await fetch(`assets/sons/${arq}.wav`);
      if (!r.ok) continue;
      buffers[nome] = await ctx.decodeAudioData(await r.arrayBuffer());
      return;
    } catch {}
  }
}

export function liberarAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new AudioContext();
  for (const n of NOMES) carregar(n);
}

export function tocar(nome) {
  if (!ctx || mudo || !buffers[nome]) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[nome];
  const g = ctx.createGain();
  g.gain.value = VOLUME[nome] ?? 0.8;
  src.connect(g).connect(ctx.destination);
  src.start();
}

export function alternarMudo() { mudo = !mudo; return mudo; }
