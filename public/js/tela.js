// Tela do jogo (PC): mostra a partida e, se a pessoa entrar, joga pelo teclado.
import { Cena } from './cena.js';
import { CenaIso } from './cena_iso.js';
import { PERSONAGENS, CORES, PERS_COR, COR_PERS, NOME_TIME, MUNDOS, ICONE, ITENS, bussola, passoDaMissao, SETA } from './comum.js';
import { hospedar, entrarNaSala, codigoDaUrl, Interpolador } from './rede.js';
import { liberarAudio, tocar, alternarMudo } from './som.js';
import { TREINOS } from '../jogo/treino.js';
import { Planetas } from './planetas.js';

const $ = id => document.getElementById(id);
const SOM_DO_EVENTO = { pulo: 'pulo', pouso: 'pouso', bandeira: 'bandeira', peca: 'peca', alavanca: 'alavanca',
                        portal: 'chegada', derrota: 'derrota', vitoria: 'vitoria', trocar: 'trocar', entrou: 'entrou',
                        contagem: 'contagem', morte: 'perdeu_coracao', renasceu: 'chegada', compra: 'compra', negado: 'clique',
                        // Mundo 2
                        pegar: 'pegar', soltar: 'soltar', empurrou: 'empurrar', construir: 'construir', ajudou: 'ajudar',
                        levantou: 'chegada', caiu: 'caiu', missao: 'missao', encaixe: 'construir' };
const corDe = id => PERS_COR[id];
const coracoes = (n, max) => Array.from({ length: max }, (_, k) => `<img src="${k < n ? ICONE.coracao : ICONE.coracaoVazio}">`).join('');

const cenaLado = new Cena($('cena'));
// Mundo 2 tem a própria cena isométrica (outro canvas); "cena" aponta para a da fase atual.
const cenaIso = new CenaIso($('cenaIso'));
let cena = cenaLado;
const iso = () => fase?.modo === 'iso';
const interp = new Interpolador();
let sala = { estado: 'lobby', etapa: 'inicio', jogadores: [], fases: [], times: [] };
let meuId = null;
let fase = null;
let ultimoEstado = null;
let mortos = [];

$('somIcone').src = ICONE.somLigado;
// Sem ?sala= esta tela é a anfitriã (roda a partida). Com ?sala=ABCD, é outro PC entrando numa sala existente.
const codigoVisitante = codigoDaUrl();
const rede = codigoVisitante
  ? entrarNaSala(codigoVisitante, receber, ok => avisar(ok ? '' : 'Procurando a sala ' + codigoVisitante + '…'))
  : hospedar(receber, ok => avisar(ok ? '' : 'Sem internet: só este PC consegue jogar agora.'));
function avisar(texto) { $('aviso').textContent = texto; $('aviso').classList.toggle('oculto', !texto); }


function receber(m) {
  switch (m.t) {
    case 'oi':
    case 'sala': {
      const antes = sala.estado, pausadoAntes = sala.pausado;
      sala = m;
      if (pausadoAntes && !m.pausado && meuId) { ultimaEnviada = ''; enviarEntrada(); } // a sala zerou as entradas na pausa
      if (m.estado === 'contagem' && antes !== 'contagem') iniciarContagem(m.contagemFim);
      if (m.estado === 'lobby' || m.estado === 'loja') { fase = null; mortos = []; }
      atualizarTudo();
      break;
    }
    case 'voce': meuId = m.id; atualizarTudo(); break;
    case 'fase':
      fase = m.fase; mortos = [];
      interp.limpar();
      cena = iso() ? cenaIso : cenaLado;
      $('cena').classList.toggle('oculto', iso());
      $('cenaIso').classList.toggle('oculto', !iso());
      cena.carregarFase(fase);
      atualizarTudo();
      break;
    case 's': interp.chegou(m); break;
    case 'ev':
      if (m.e === 'botao' || m.e === 'placa') { if (m.on) tocar(m.e); break; }
      if (SOM_DO_EVENTO[m.e]) tocar(SOM_DO_EVENTO[m.e]);
      if (m.e === 'morte') { mortos.push(m.id); balao(m, 2.4, m.coracoes > 0 ? `−1 coração · restam ${m.coracoes}` : 'Sem corações!', corDe(m.id)); }
      if (m.e === 'negado') balao(m, 1.6, `Só o ${NOME_TIME[m.cor]}!`, m.cor);
      if (m.e === 'caiu') balao(m, 2.6, 'Socorro! Alguém me ajuda?', corDe(m.id));
      if (m.e === 'ajudou') balao(m, 2.6, `Valeu, ${NOME_TIME[corDe(m.por)]}!`, corDe(m.id));
      if (m.e === 'missao') avisoMissao(m);
      if (m.e === 'mundoCompleto') mundoCompleto(m.mundo);
      if (m.e === 'treino') { tocar('bandeira'); $('objetivo').classList.remove('feito'); void $('objetivo').offsetWidth; $('objetivo').classList.add('feito'); }
      cena.efeito(m);
      break;
    case 'cheio': $('status').textContent = 'A sala já tem 4 jogadores.'; break;
  }
}

const donoDe = p => sala.jogadores.find(j => j.pers.includes(p));
const fmtTempo = s => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

// ---------- menu: início → equipe → fase ----------
const etapa = () => sala.estado === 'loja' ? 'loja' : sala.etapa;
const irPara = e => { liberarAudio(); tocar('clique'); rede.enviar({ t: 'etapa', etapa: e }); };

// início: a turma toda acenando
$('turma').innerHTML = PERSONAGENS.map((p, i) =>
  `<img src="assets/personagens/${p}/arte.png" style="--i:${i}" alt="${NOME_TIME[corDe(p)]}">`).join('');
$('btnComecar').onclick = () => irPara('times');
// progresso salvo neste navegador: novo jogo apaga; modo livre (cheat) libera todas as fases e a oficina de graça
$('btnNovoJogo').onclick = () => {
  if (confirm('Começar um jogo novo? O progresso salvo (fases liberadas e peças) será apagado.')) { tocar('clique'); rede.enviar({ t: 'novoJogo' }); }
};
$('btnTrapaca').onclick = () => { tocar('clique'); rede.enviar({ t: 'trapaca' }); };
function atualizarInicio() {
  const total = sala.fases.length;
  $('progressoInfo').textContent = sala.trapaca ? 'Modo livre ligado: todas as fases e a oficina de graça'
    : `Progresso salvo: ${sala.liberadas} de ${total} fases · ${sala.carteira} peças`;
  $('btnTrapaca').textContent = sala.trapaca ? 'Desligar modo livre' : 'Modo livre (cheat)';
  $('btnTrapaca').classList.toggle('ligado', !!sala.trapaca);
}

function montarCards() {
  $('cards').innerHTML = '';
  for (const p of PERSONAGENS) {
    const cor = corDe(p);
    const div = document.createElement('button');
    div.className = 'card';
    div.dataset.pers = p;
    div.style.setProperty('--cor', CORES[cor]);
    div.innerHTML = `<div class="faixa">${NOME_TIME[cor]}</div>
      <div class="arte"><img src="assets/personagens/${p}/arte.png" alt="${NOME_TIME[cor]}"></div><div class="dono"></div>`;
    div.onclick = () => {
      liberarAudio();
      if (!meuId) entrar();
      rede.enviar({ t: 'escolher', pers: p });
      tocar('clique');
    };
    $('cards').append(div);
  }
}
montarCards();

// QR code do controle: mesmo endereço desta página, trocando para controle.html?sala=CÓDIGO
function mostrarCodigo(codigo) {
  const link = new URL('controle.html', location.href);
  link.search = '?sala=' + codigo;
  const qr = qrcode(0, 'M');
  qr.addData(link.href);
  qr.make();
  $('qr').src = qr.createDataURL(8, 2);
  $('url').textContent = link.href.replace(/^https?:\/\//, '');
  $('codigo').textContent = codigo;
}
if (codigoVisitante) mostrarCodigo(codigoVisitante);
else rede.aoCodigo = mostrarCodigo;

function atualizarTimes() {
  for (const div of $('cards').children) {
    const p = div.dataset.pers;
    const dono = donoDe(p);
    div.classList.toggle('livre', !dono);
    div.classList.toggle('meu', !!dono && dono.id === meuId);
    div.querySelector('.dono').innerHTML = dono
      ? `<b>${dono.nome}</b>${dono.pers[0] !== p ? ' · 2º time' : dono.tipo === 'celular' ? ' · celular' : ' · teclado'}`
      : '<span>Livre</span>';
  }
  const n = sala.jogadores.length;
  $('status').textContent = !n ? 'Esperando alguém entrar…'
    : n === 1 ? 'Sozinho: você leva 2 times e troca com Tab. Ou chame mais gente!'
    : `${n} jogadores prontos!`;
  $('btnIrFase').disabled = !n;
}
$('btnVoltarInicio').onclick = () => irPara('inicio');
$('btnIrFase').onclick = () => irPara('fase');

// escolha de fase: os 5 mundos (planetinhas) em cima e a trilha com as 11 fases do mundo escolhido
const planetas = new Planetas($('planetas'), id => {
  const liberadas = sala.fases.map((f, i) => [f, i]).filter(([f, i]) => f.mundo === id && i < sala.liberadas);
  if (!liberadas.length || sala.fases[sala.faseIdx]?.mundo === id) return;
  tocar('clique');
  rede.enviar({ t: 'escolherFase', idx: liberadas[liberadas.length - 1][1] }); // a mais adiantada daquele mundo
});
function atualizarFase() {
  const idMundo = sala.fases[sala.faseIdx]?.mundo || 'exploradores';
  const mundo = MUNDOS[idMundo] || MUNDOS.exploradores;
  const doMundo = sala.fases.map((f, i) => [f, i]).filter(([f]) => f.mundo === idMundo);
  const info = {};
  for (const id of Object.keys(MUNDOS)) {
    const idx = sala.fases.map((f, i) => (f.mundo === id ? i : -1)).filter(i => i >= 0);
    info[id] = { trancado: !idx.length || idx[0] >= sala.liberadas, feitas: idx.filter(i => i < sala.liberadas - 1).length, total: idx.length };
  }
  planetas.atualizar(idMundo, info);
  $('tituloMundo').innerHTML = `<img src="${mundo.selo}" alt="">Mundo ${mundo.n} · ${mundo.nome}`;
  $('subMundo').innerHTML = `Escolha o mundo e a fase. Cada vitória libera a próxima. ${sala.trapaca ? '<span class="pilula livre">Modo livre</span>' : `<span class="pilula"><img src="assets/ui/ic_bloco.png">${sala.carteira} peças</span>`}`;
  const pts = doMundo.map((_, k) => [4 + k * (92 / Math.max(1, doMundo.length - 1)), k % 2 ? 28 : 70]);
  $('trilha').innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${pts.length > 1 ? curva(pts) : ''}" /></svg>` +
    doMundo.map(([f, i], k) => {
      const trancada = i >= sala.liberadas, feita = i < sala.liberadas - 1, tres = f.modo === 'iso';
      return `<button class="parada ${i === sala.faseIdx ? 'sel' : ''} ${trancada ? 'trancada' : ''} ${feita ? 'feita' : ''} ${tres ? 'tres-d' : ''}" data-i="${i}" style="left:${pts[k][0]}%;top:${pts[k][1]}%;--cor:${mundo.cor}" ${trancada ? 'disabled' : ''}>
        <span class="bola"><b>${trancada ? CADEADO : feita ? '✓' : tres ? '3D' : k + 1}</b></span><span class="nome">${tres ? 'Mapa 3D · ' : ''}${f.nome}</span></button>`;
    }).join('');
  for (const b of $('trilha').querySelectorAll('.parada:not(.trancada)'))
    b.onclick = () => { tocar('clique'); rede.enviar({ t: 'escolherFase', idx: +b.dataset.i }); };
  const f = sala.fases[sala.faseIdx];
  $('detalhe').innerHTML = `<div class="num" style="background:${mundo.cor}">${f.modo === 'iso' ? '3D' : f.id}</div>
    <div><h3>${f.nome}${f.modo === 'iso' ? ' <span class="pilula">mapa 3D</span>' : ''}</h3><p>${f.dica}</p></div>
    <div class="vidas"><div class="cors">${coracoes(f.coracoes, f.coracoes)}</div>${f.coracoes} corações por time</div>`;
}
// curva suave (Catmull-Rom) que passa pelas paradas da trilha
function curva(p) {
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c[0]} ${c[1]}`;
  }
  return d;
}
const CADEADO = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
$('btnVoltarTimes').onclick = () => irPara('times');

// barra de passos: marca o atual e os já feitos
function atualizarPassos() {
  const ordem = ['times', 'fase', 'loja', 'jogar'];
  const atual = ordem.indexOf(etapa());
  $('passos').classList.toggle('oculto', atual < 0 || !['lobby', 'loja'].includes(sala.estado));
  for (const li of $('passos').children) {
    const k = ordem.indexOf(li.dataset.p);
    li.classList.toggle('atual', k === atual);
    li.classList.toggle('feito', k < atual);
  }
}

// chave desta aba: se outro PC recarregar a página, volta como o mesmo jogador
let chave = '';
try { chave = sessionStorage.getItem('mja_chave') || ''; if (!chave) { chave = Math.random().toString(36).slice(2); sessionStorage.setItem('mja_chave', chave); } } catch {}
function entrar() { if (!meuId) rede.enviar({ t: 'entrar', tipo: 'teclado', nome: '', chave }); }
$('btnLoja').onclick = () => { liberarAudio(); tocar('clique'); rede.enviar({ t: 'loja' }); };

// ---------- oficina ----------
function atualizarLoja() {
  $('carteira').textContent = sala.trapaca ? '∞' : sala.carteira;
  const f = sala.fases[sala.faseIdx];
  $('lojaFase').innerHTML = `Próxima fase: <b>${f.id} · ${f.nome}</b> · ${f.coracoes} corações por time`;
  $('itens').innerHTML = Object.entries(sala.loja).map(([item, def]) => {
    const botoes = sala.times.map(cor => {
      const qt = sala.compras[cor]?.[item] || 0;
      const cheio = qt >= def.max;
      const pode = !cheio && (sala.trapaca || sala.carteira >= def.preco);
      return `<button class="comprar ${cheio ? 'cheio' : ''}" style="border-color:${CORES[cor]}" data-item="${item}" data-cor="${cor}" ${pode ? '' : 'disabled'}
        title="Montar para o ${NOME_TIME[cor]}"><img src="assets/personagens/${COR_PERS[cor]}/retrato.png">${qt ? `<span class="qt">${def.max > 1 ? qt : '✓'}</span>` : ''}</button>`;
    }).join('');
    return `<div class="item cartao"><img class="ic" src="${ITENS[item].icone}"><h3>${def.nome}</h3><div class="desc">${ITENS[item].desc}</div>
      <div class="preco"><img src="assets/ui/ic_bloco.png">${def.preco} peças</div><div class="compradores">${botoes}</div></div>`;
  }).join('');
  for (const b of $('itens').querySelectorAll('.comprar')) b.onclick = () => rede.enviar({ t: 'comprar', item: b.dataset.item, cor: b.dataset.cor });
}
$('btnJogar').onclick = () => { tocar('clique'); rede.enviar({ t: 'jogar' }); };
$('btnLojaMenu').onclick = () => { tocar('clique'); rede.enviar({ t: 'lobby' }); };

// ---------- HUD ----------
function atualizarHud(s) {
  if (!fase || !s) return;
  const html = fase.personagens.map((p, i) => {
    const cor = corDe(p.id);
    const dono = donoDe(p.id);
    const [n, max] = s.cor[i];
    const fx = s.ch[i][5];
    const bandeiras = fase.gemas.map((g, k) => [g, s.gemas[k]]).filter(([g]) => g.cor === cor);
    const pegas = bandeiras.filter(([, ok]) => ok).length;
    const extras = [
      bandeiras.length ? `<img src="assets/ui/bandeira_${cor}.png">${pegas}/${bandeiras.length}` : '',
      fx & 8 ? `<img src="${ITENS.mola.icone}">` : '',
      fx & 16 ? `<img src="${ITENS.planador.icone}">` : '',
    ].join(' ');
    return `<div class="time ${n === 0 ? 'morto' : ''}" style="border-left-color:${CORES[cor]}">
      <img class="ret ${dono?.ativo === p.id ? '' : 'inativo'}" style="border-color:${CORES[cor]}" src="assets/personagens/${p.id}/retrato.png">
      <div class="nome" style="color:${CORES[cor]}">${NOME_TIME[cor]} <small>· ${dono ? dono.nome : '—'}</small></div>
      <div class="cors">${coracoes(n, max)}</div><div class="extras">${extras}</div></div>`;
  }).join('');
  if ($('hudTimes').dataset.h !== html) { $('hudTimes').innerHTML = html; $('hudTimes').dataset.h = html; }
  $('hudPecas').textContent = s.pecas;
  $('hudTempo').textContent = fmtTempo(s.tempo);
  if (iso()) atualizarMissoes(s);
  else { $('hudFase').textContent = `${fase.id} · ${fase.nome}`; missoesHtml = ''; }
}

// ---------- Mundo 2: lista de missões, bússola e câmeras ----------
let missoesHtml = '';
// Missões como bolinhas na barra de cima (✓ feita, número, cadeado); o que fazer fica só na bússola.
function atualizarMissoes(s) {
  const feita = id => s.missoes[fase.missoes.findIndex(m => m.id === id)];
  const html = '<span class="rot-missoes">Missões</span>' + fase.missoes.map((m, k) => {
    const trancada = m.depois && !m.depois.every(feita);
    return `<b class="mbola ${s.missoes[k] ? 'feita' : ''} ${trancada ? 'trancada' : ''}" title="${m.nome}">${s.missoes[k] ? '✓' : trancada ? CADEADO.replace('<svg', '<svg width="12"') : k + 1}</b>`;
  }).join('');
  if (html !== missoesHtml) { $('hudFase').innerHTML = html; missoesHtml = html; }
}
// Quem esta tela segue: os personagens de quem joga aqui (2 = tela dividida); ninguém = plateia (mapa todo).
function meusPersonagens() { return sala.jogadores.find(j => j.id === meuId)?.pers || []; }
// Dois personagens nesta tela: uma câmera só enquanto estão perto; tela dividida quando se afastam.
let juntos = true;
function seguirComCamera(s) {
  const meus = meusPersonagens();
  if (meus.length === 2 && s?.iso && fase) {
    const [a, b] = meus.map(id => s.ch[fase.personagens.findIndex(p => p.id === id)]);
    if (a && b) {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 9) juntos = false;
      else if (d < 6) juntos = true;
    }
  }
  cenaIso.seguir(meus, { juntos, ativo: sala.jogadores.find(j => j.id === meuId)?.ativo });
  $('divisor').classList.toggle('oculto', cenaIso.vistas.length < 2);
}
// Bússola só do personagem ativo (o que esta tela está controlando), no meio da metade dele.
function atualizarBussolas(s) {
  const meus = meusPersonagens();
  const ativo = sala.jogadores.find(j => j.id === meuId)?.ativo;
  const html = [ativo].filter(Boolean).map(id => {
    const b = bussola(fase, s, fase.personagens.findIndex(p => p.id === id));
    const dividida = cenaIso.vistas.length > 1;
    const lugar = dividida ? (meus.indexOf(id) === 0 ? 25 : 75) : 50;
    const estilo = `style="border-color:${CORES[corDe(id)]};left:${lugar}%${dividida ? ';max-width:44vw' : ''}"`;
    return b ? `<div class="bussola" ${estilo} data-ang="${b.angulo}"><span class="seta">${SETA}</span><span><b>${b.numero} · ${b.m.nome}${b.passo.total > 1 ? ` <i>passo ${b.passo.i + 1} de ${b.passo.total}</i>` : ''}</b><small>${b.passo.texto}</small></span></div>`
             : `<div class="bussola" ${estilo}><span class="seta">✓</span><span><b>Todas as missões feitas!</b></span></div>`;
  }).join('');
  const caixa = $('bussolaPc');
  if (caixa.dataset.h !== html.replace(/data-ang="[^"]*"/g, '')) { caixa.innerHTML = html; caixa.dataset.h = html.replace(/data-ang="[^"]*"/g, ''); }
  // só gira a seta (sem refazer o HTML a cada quadro)
  const angs = [...html.matchAll(/data-ang="([^"]*)"/g)].map(m => m[1]);
  caixa.querySelectorAll('.bussola').forEach((el, i) => { const svg = el.querySelector('svg'); if (svg && angs[i] !== undefined) svg.style.transform = `rotate(${angs[i]}deg)`; });
}
function avisoMissao(m) {
  const k = fase.missoes.findIndex(o => o.id === m.id);
  const div = document.createElement('div');
  div.className = 'aviso-missao';
  div.innerHTML = m.final ? `${fase.missoes[k].nome}! 🏆<small>Missão final cumprida. Que equipe!</small>`
                          : `Missão ${k + 1} concluída!<small>${fase.missoes[k].nome}</small>`;
  $('hud').append(div);
  setTimeout(() => div.remove(), 2600);
}

// ---------- treino jogável ----------
// O tutorial (tutorial.js) pede o treino com o evento 'treinar'; esta tela entra na sala (se preciso) e começa.
addEventListener('treinar', ev => {
  ev.detail.ok = true;
  liberarAudio();
  if (!meuId) entrar();
  rede.enviar({ t: 'treino', modo: ev.detail.modo });
});
// Painel de objetivo embaixo da tela: o que fazer agora e as teclas que ajudam.
function atualizarObjetivo() {
  const t = sala.treino;
  $('objetivo').classList.toggle('oculto', !t || !['contagem', 'jogando'].includes(sala.estado));
  if (!t) return;
  const PASSOS = TREINOS[t.modo].passos;
  const passo = PASSOS[t.passo];
  const sozinho = sala.jogadores.length === 1;
  $('objetivo').innerHTML = passo
    ? `<div class="obj-num">Treino · ${t.passo + 1} de ${PASSOS.length}</div>
       <div class="obj-texto">${passo.texto}${passo.teclas.length ? ` <span class="obj-teclas">${passo.teclas.map(k => `<kbd>${k}</kbd>`).join('')}</span>` : ''}</div>
       ${sozinho ? '<div class="obj-extra">Jogando sozinho: <kbd>Tab</kbd> troca de personagem. Os dois precisam chegar!</div>' : ''}
       <div class="obj-barra">${PASSOS.map((_, i) => `<i class="${i < t.passo ? 'ok' : i === t.passo ? 'agora' : ''}"></i>`).join('')}</div>`
    : '<div class="obj-texto">Muito bem!</div>';
}

// Nome do jogador em cima do personagem que ele está controlando.
function atualizarRotulos(s) {
  // jogando sozinho no PC o nome em cima só polui a tela
  if (!fase || !s || (iso() && sala.jogadores.length < 2)) { $('rotulos').innerHTML = ''; return; }
  $('rotulos').innerHTML = fase.personagens.map((p, i) => {
    const dono = donoDe(p.id);
    if (!dono || dono.ativo !== p.id) return '';
    return posicoes(s.ch[i], 2.15).map(pos =>
      `<div class="rotulo" style="left:${pos.x}px;top:${pos.y}px;background:${CORES[corDe(p.id)]}">${dono.nome}</div>`).join('');
  }).join('');
}
// Pontos na tela de algo do jogo, "acima" unidades acima dele. Mundo 1: [x, y]; Mundo 2: [x, z, y] (pode aparecer nas duas metades).
function posicoes(o, acima) {
  if (iso()) {
    const [x, z, y] = Array.isArray(o) ? o : [o.x, o.z, o.y ?? 0];
    return cenaIso.projetarTodas(x, y + acima + 0.15, z);
  }
  const [x, y] = Array.isArray(o) ? o : [o.x, o.y];
  return [cena.projetar(x, y - acima)];
}

function balao(o, acima, texto, cor) {
  for (const pos of posicoes(o, acima)) {
    const div = document.createElement('div');
    div.className = 'balao';
    Object.assign(div.style, { left: pos.x + 'px', top: pos.y + 'px', borderColor: CORES[cor] });
    div.innerHTML = `<img src="assets/personagens/${COR_PERS[cor]}/retrato.png">${texto}`;
    $('baloes').append(div);
    setTimeout(() => div.remove(), 1700);
  }
}

// ---------- contagem e fim ----------
let timerContagem = null;
function iniciarContagem(ms) {
  clearInterval(timerContagem);
  const fimEm = performance.now() + ms;
  const f = sala.fases[sala.faseIdx];
  $('contagem').classList.remove('oculto');
  $('contagemDica').textContent = f ? `${f.id} · ${f.dica}` : '';
  const tick = () => {
    const resta = Math.ceil((fimEm - performance.now()) / 1000);
    if (resta <= 0) { $('contagem').classList.add('oculto'); clearInterval(timerContagem); return; }
    const span = $('contagemNum');
    if (span.textContent !== String(resta)) { span.textContent = resta; span.style.animation = 'none'; void span.offsetWidth; span.style.animation = ''; }
  };
  tick();
  timerContagem = setInterval(tick, 50);
}

function mostrarFim() {
  if (sala.treino) {  // fim do treino: parabéns e direto para a escolha de fase
    $('painelFim').innerHTML = `<img class="selo" src="assets/ui/ic_medalha.png"><h2>Treino completo!</h2>
      <div class="sub">Agora vocês já sabem jogar. Bora para a primeira fase?</div>
      <div class="acoes"><button class="btn grande" data-acao="continuar">Escolher fase</button></div>
      <div class="dica">ENTER continua</div>`;
    for (const b of $('painelFim').querySelectorAll('[data-acao]')) b.onclick = () => { tocar('clique'); rede.enviar({ t: b.dataset.acao }); };
    return;
  }
  const p = sala.placar;
  const venceu = sala.resultado === 'vitoria';
  const ultima = sala.faseIdx === sala.fases.length - 1;
  const bandeiras = p ? Object.entries(p.gemas).filter(([cor]) => cor !== 'peca').map(([cor, g]) =>
    `<span><img src="assets/ui/bandeira_${cor}.png">${g.pegas}/${g.total}</span>`).join('') : '';
  const placar = `<div class="placar"><span>⏱ ${fmtTempo(p?.tempo || 0)}</span>${bandeiras}
    <span><img src="assets/ui/ic_bloco.png">+${sala.ultimoGanho} peças</span></div>`;
  const botoes = `<div class="acoes">
      <button class="btn grande ${venceu ? '' : 'rosa'}" data-acao="continuar">${venceu ? (ultima ? 'Concluir mundo' : 'Próxima fase') : 'Tentar de novo'}</button>
      <button class="btn claro" data-acao="lobby">Menu</button></div>
    <div class="dica">ENTER continua · ESC volta ao menu · a equipe tem ${sala.carteira} peças para a oficina</div>`;
  const semCoracao = fase?.personagens.filter((q, i) => ultimoEstado?.cor?.[i]?.[0] === 0).map(q => q.id) || [];
  $('painelFim').innerHTML = venceu
    ? `<img class="selo" src="assets/ui/ic_trofeu.png"><h2>Missão cumprida!</h2><div class="sub">Trabalho em equipe!</div>${placar}${botoes}`
    : `<h2>Tente de novo!</h2>
       <div class="derrotados">${(semCoracao.length ? semCoracao : mortos.slice(-1)).map(id => `<img src="assets/personagens/${id}/derrota.png">`).join('')}</div>
       <div class="sub">${semCoracao.map(id => NOME_TIME[corDe(id)]).join(' e ')} ficou sem corações. Na oficina dá para montar corações extras!</div>
       ${placar}${botoes}`;
  for (const b of $('painelFim').querySelectorAll('[data-acao]')) b.onclick = () => { tocar('clique'); rede.enviar({ t: b.dataset.acao }); };
}

// ---------- pausa ----------
const pausar = () => { if (sala.estado === 'jogando' && !sala.pausado) { tocar('clique'); rede.enviar({ t: 'pausar' }); } };
const ACAO_PAUSA = { retomar: { t: 'retomar' }, reiniciar: { t: 'reiniciar' }, loja: { t: 'sairFase', para: 'loja' }, menu: { t: 'sairFase', para: 'lobby' } };
for (const b of $('pausa').querySelectorAll('[data-pausa]')) b.onclick = () => { tocar('clique'); rede.enviar(ACAO_PAUSA[b.dataset.pausa]); };
$('btnPausa').onclick = pausar;
function mostrarPausa() {
  $('pausaQuem').textContent = `${sala.pausado} pausou${fase ? ` · ${fase.id} · ${fase.nome}` : ''}`;
  $('pausaTutorial').dataset.tutorial = fase?.modo === 'iso' ? 'iso' : 'plataforma';
}

function mundoCompleto(id = 'exploradores') {
  const div = document.createElement('div');
  div.className = 'balao';
  Object.assign(div.style, { left: '50%', top: '30%', fontSize: '4vh', padding: '2vh 3vw', borderColor: CORES.amarelo });
  div.innerHTML = `<img src="assets/ui/ic_medalha.png" style="height:8vh;border-radius:0">Mundo ${MUNDOS[id]?.n ?? ''} completo! Parabéns, equipe!`;
  document.body.append(div);
  setTimeout(() => div.remove(), 4000);
}

function atualizarTudo() {
  const est = sala.estado;
  const tela = est === 'lobby' ? sala.etapa : est === 'loja' ? 'loja' : null;
  for (const id of ['inicio', 'times', 'fase', 'loja']) $(id).classList.toggle('oculto', tela !== id);
  atualizarPassos();
  $('roboeduc').classList.toggle('oculto', est !== 'lobby' && est !== 'loja');
  $('hud').classList.toggle('oculto', !['contagem', 'jogando', 'fim'].includes(est));
  $('fim').classList.toggle('oculto', est !== 'fim');
  atualizarObjetivo();
  const noMapa = iso() && ['contagem', 'jogando', 'fim'].includes(est);
  $('missoes').classList.add('oculto');
  $('bussolaPc').classList.toggle('oculto', !noMapa || est === 'fim');
  if (!noMapa) $('divisor').classList.add('oculto');
  if (!noMapa) { $('cenaIso').classList.add('oculto'); $('cena').classList.remove('oculto'); }
  else { $('cenaIso').classList.remove('oculto'); $('cena').classList.add('oculto'); }
  $('pausa').classList.toggle('oculto', !sala.pausado);
  $('btnPausa').classList.toggle('oculto', est !== 'jogando' || !!sala.pausado);
  if (sala.pausado) mostrarPausa();
  if (tela === 'inicio') atualizarInicio();
  if (tela === 'times') atualizarTimes();
  if (tela === 'fase') atualizarFase();
  planetas.ligar(tela === 'fase');
  if (est === 'loja') atualizarLoja();
  if (est === 'fim') mostrarFim();
  $('hudTimes').dataset.h = '';
}

// ---------- teclado ----------
const TECLAS_LADO = {
  esq: ['ArrowLeft', 'KeyA'], dir: ['ArrowRight', 'KeyD'],
  pulo: ['ArrowUp', 'KeyW', 'Space'], acao: ['ArrowDown', 'KeyS', 'KeyE'],
};
// Mundo 2: setas/WASD andam nas 4 direções (da tela), Espaço pula, E faz a ação
const TECLAS_ISO = {
  esq: ['ArrowLeft', 'KeyA'], dir: ['ArrowRight', 'KeyD'], cima: ['ArrowUp', 'KeyW'], baixo: ['ArrowDown', 'KeyS'],
  pulo: ['Space'], acao: ['KeyE', 'KeyF', 'ShiftLeft'],
};
const teclas = () => (iso() ? TECLAS_ISO : TECLAS_LADO);
const TODAS_TECLAS = [...new Set([...Object.values(TECLAS_LADO), ...Object.values(TECLAS_ISO)].flat())];
const apertadas = new Set();
let ultimaEnviada = '';
function enviarEntrada() {
  const e = {};
  for (const [k, cods] of Object.entries(teclas())) e[k] = cods.some(c => apertadas.has(c));
  const s = JSON.stringify(e);
  if (s !== ultimaEnviada) { ultimaEnviada = s; rede.enviar({ t: 'entrada', ...e }); }
}
addEventListener('keydown', ev => {
  liberarAudio();
  if (ev.code === 'Tab') { ev.preventDefault(); if (!ev.repeat) rede.enviar({ t: 'trocar' }); return; }
  if (ev.code === 'KeyQ' && !ev.repeat) { rede.enviar({ t: 'trocar' }); return; }
  if (sala.pausado) { // pausado: ESC/P/ENTER continuam, nada mais vai para a partida
    if (['Escape', 'KeyP', 'Enter'].includes(ev.code) && !ev.repeat) { tocar('clique'); rede.enviar({ t: 'retomar' }); }
    return;
  }
  if (sala.estado === 'jogando' && (ev.code === 'Escape' || ev.code === 'KeyP') && !ev.repeat) { pausar(); return; }
  if (ev.code === 'Enter' && !ev.repeat) {
    if (sala.estado === 'lobby') {
      if (sala.etapa === 'inicio') irPara('times');
      else if (sala.etapa === 'times') { if (!meuId) entrar(); else irPara('fase'); }
      else rede.enviar({ t: 'loja' });
    }
    else if (sala.estado === 'loja') rede.enviar({ t: 'jogar' });
    else if (sala.estado === 'fim') rede.enviar({ t: 'continuar' });
    return;
  }
  if (ev.code === 'Escape') {
    if (sala.estado === 'fim' || sala.estado === 'loja') rede.enviar({ t: 'lobby' });
    else if (sala.estado === 'lobby' && sala.etapa !== 'inicio') irPara(sala.etapa === 'fase' ? 'times' : 'inicio');
    return;
  }
  // na escolha de fase, ↑ ↓ trocam de mundo
  if (sala.estado === 'lobby' && sala.etapa === 'fase' && (ev.code === 'ArrowUp' || ev.code === 'ArrowDown')) {
    const ids = Object.keys(MUNDOS), atual = ids.indexOf(sala.fases[sala.faseIdx]?.mundo);
    const id = ids[atual + (ev.code === 'ArrowDown' ? 1 : -1)];
    const idx = id ? sala.fases.map((f, i) => [f, i]).filter(([f, i]) => f.mundo === id && i < sala.liberadas).pop()?.[1] : undefined;
    if (idx !== undefined) { tocar('clique'); rede.enviar({ t: 'escolherFase', idx }); }
    return;
  }
  // na trilha de fases, ← → escolhem a fase
  if (sala.estado === 'lobby' && sala.etapa === 'fase' && (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight')) {
    const idx = Math.max(0, Math.min(sala.liberadas - 1, sala.faseIdx + (ev.code === 'ArrowRight' ? 1 : -1)));
    if (idx !== sala.faseIdx) { tocar('clique'); rede.enviar({ t: 'escolherFase', idx }); }
    return;
  }
  if (TODAS_TECLAS.includes(ev.code)) ev.preventDefault();
  apertadas.add(ev.code);
  if (meuId) enviarEntrada();
});
addEventListener('keyup', ev => { apertadas.delete(ev.code); if (meuId) enviarEntrada(); });
addEventListener('blur', () => { apertadas.clear(); if (meuId) enviarEntrada(); });
addEventListener('pointerdown', liberarAudio);

$('som').onclick = () => { $('somIcone').src = alternarMudo() ? ICONE.somDesligado : ICONE.somLigado; };

// ---------- laço de desenho ----------
let antes = performance.now();
function laco(agora) {
  const dt = Math.min(0.05, (agora - antes) / 1000);
  antes = agora;
  const s = interp.agora();
  const emJogo = ['contagem', 'jogando', 'fim'].includes(sala.estado);
  if (iso()) seguirComCamera(s);
  if (s && fase && s.ch.length === fase.personagens.length && !!s.iso === iso()) {
    cena.aplicarEstado(s);
    if (s !== ultimoEstado) { atualizarHud(s); ultimoEstado = s; }
    if (emJogo) atualizarRotulos(s);
    if (emJogo && iso()) atualizarBussolas(s);
  }
  if (emJogo) cena.quadro(sala.pausado ? 0 : dt); // pausado: congela a cena, mas continua desenhando
  requestAnimationFrame(laco);
}
requestAnimationFrame(laco);
