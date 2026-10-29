// Tela do jogo (PC): mostra a partida e, se a pessoa entrar, joga pelo teclado.
import { Cena } from './cena.js';
import { PERSONAGENS, CORES, PERS_COR, COR_PERS, NOME_TIME, MUNDOS, ICONE, ITENS } from './comum.js';
import { conectar, Interpolador } from './rede.js';
import { liberarAudio, tocar, alternarMudo } from './som.js';

const $ = id => document.getElementById(id);
const SOM_DO_EVENTO = { pulo: 'pulo', pouso: 'pouso', bandeira: 'bandeira', peca: 'peca', alavanca: 'alavanca',
                        portal: 'chegada', derrota: 'derrota', vitoria: 'vitoria', trocar: 'trocar', entrou: 'entrou',
                        contagem: 'contagem', morte: 'perdeu_coracao', renasceu: 'chegada', compra: 'compra', negado: 'clique' };
const corDe = id => PERS_COR[id];
const coracoes = (n, max) => Array.from({ length: max }, (_, k) => `<img src="${k < n ? ICONE.coracao : ICONE.coracaoVazio}">`).join('');

const cena = new Cena($('cena'));
const interp = new Interpolador();
let sala = { estado: 'lobby', jogadores: [], fases: [], times: [] };
let meuId = null;
let fase = null;
let ultimoEstado = null;
let mortos = [];

$('somIcone').src = ICONE.somLigado;
const rede = conectar(receber, ok => $('aviso').classList.toggle('oculto', ok));

function receber(m) {
  switch (m.t) {
    case 'oi':
    case 'sala': {
      const antes = sala.estado;
      sala = m;
      if (m.estado === 'contagem' && antes !== 'contagem') iniciarContagem(m.contagemFim);
      if (m.estado === 'lobby' || m.estado === 'loja') { fase = null; mortos = []; }
      atualizarTudo();
      break;
    }
    case 'voce': meuId = m.id; atualizarTudo(); break;
    case 'fase':
      fase = m.fase; mortos = [];
      interp.limpar();
      cena.carregarFase(fase);
      break;
    case 's': interp.chegou(m); break;
    case 'ev':
      if (m.e === 'botao') { if (m.on) tocar('botao'); break; }
      if (SOM_DO_EVENTO[m.e]) tocar(SOM_DO_EVENTO[m.e]);
      if (m.e === 'morte') { mortos.push(m.id); balao(m.x, m.y - 2.4, m.coracoes > 0 ? `−1 coração · restam ${m.coracoes}` : 'Sem corações!', corDe(m.id)); }
      if (m.e === 'negado') balao(m.x, m.y - 1.6, `Só o ${NOME_TIME[m.cor]}!`, m.cor);
      if (m.e === 'mundoCompleto') mundoCompleto();
      cena.efeito(m);
      break;
    case 'cheio': $('status').textContent = 'A sala já tem 4 jogadores.'; break;
  }
}

const donoDe = p => sala.jogadores.find(j => j.pers.includes(p));
const fmtTempo = s => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

// ---------- lobby ----------
function montarCards() {
  $('cards').innerHTML = '';
  for (const p of PERSONAGENS) {
    const cor = corDe(p);
    const div = document.createElement('div');
    div.className = 'card';
    div.dataset.pers = p;
    div.innerHTML = `<div class="faixa" style="background:${CORES[cor]}">${NOME_TIME[cor].toUpperCase()}</div>
      <div class="arte"><img src="/assets/personagens/${p}/arte.png" alt="${NOME_TIME[cor]}"></div><div class="dono"></div>`;
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

fetch('/info.json').then(r => r.json()).then(i => { $('qr').src = i.qr; $('url').textContent = i.urlControle.replace('http://', ''); });

function atualizarLobby() {
  for (const div of $('cards').children) {
    const p = div.dataset.pers;
    const dono = donoDe(p);
    div.classList.toggle('livre', !dono);
    div.classList.toggle('meu', !!dono && dono.id === meuId);
    div.querySelector('.dono').textContent = dono
      ? `${dono.nome}${dono.tipo === 'celular' ? ' · celular' : ''}${dono.pers[0] !== p ? ' (2º)' : ''}` : 'Livre';
  }
  const mundo = MUNDOS[sala.fases[0]?.mundo] || MUNDOS.exploradores;
  const lista = sala.fases.map((f, i) => {
    const trancada = i >= sala.liberadas;
    return `<div class="fase-chip ${i === sala.faseIdx ? 'sel' : ''} ${trancada ? 'trancada' : ''}" data-i="${i}">
      <b>${f.id}</b>${f.nome}<div class="cors">${coracoes(f.coracoes, f.coracoes)}</div></div>`;
  }).join('');
  $('fases').innerHTML = `<div class="cab"><img src="${mundo.selo}">Mundo 1 · ${mundo.nome}
      <span style="margin-left:auto" class="pilula"><img src="/assets/ui/ic_bloco.png" style="height:2.6vh">${sala.carteira}</span></div>
    <div class="lista">${lista}</div>`;
  for (const chip of $('fases').querySelectorAll('.fase-chip:not(.trancada)')) chip.onclick = () => { tocar('clique'); rede.enviar({ t: 'escolherFase', idx: +chip.dataset.i }); };

  const n = sala.jogadores.length;
  $('status').textContent = !n ? 'Esperando jogadores… (de 1 a 4 pessoas)'
    : n === 1 ? 'Jogando sozinho: você leva 2 times e troca entre eles com Tab. Chame mais gente pelo QR code!'
    : `${n} jogadores · ${sala.times.length} times. Aperte JOGAR quando todos estiverem prontos!`;
  $('btnLoja').disabled = !n;
}

function entrar() { if (!meuId) rede.enviar({ t: 'entrar', tipo: 'teclado', nome: '' }); }
$('btnLoja').onclick = () => { liberarAudio(); tocar('clique'); rede.enviar({ t: 'loja' }); };

// ---------- oficina ----------
function atualizarLoja() {
  $('carteira').textContent = sala.carteira;
  const f = sala.fases[sala.faseIdx];
  $('lojaFase').innerHTML = `Próxima fase: <span class="nome">${f.id} · ${f.nome}</span> · ${f.coracoes} corações por time<br>${f.dica}`;
  $('itens').innerHTML = Object.entries(sala.loja).map(([item, def]) => {
    const botoes = sala.times.map(cor => {
      const qt = sala.compras[cor]?.[item] || 0;
      const cheio = qt >= def.max;
      const pode = !cheio && sala.carteira >= def.preco;
      return `<button class="comprar ${cheio ? 'cheio' : ''}" style="border-color:${CORES[cor]}" data-item="${item}" data-cor="${cor}" ${pode ? '' : 'disabled'}
        title="Montar para o ${NOME_TIME[cor]}"><img src="/assets/personagens/${COR_PERS[cor]}/retrato.png">${qt ? `<span class="qt">${def.max > 1 ? qt : '✓'}</span>` : ''}</button>`;
    }).join('');
    return `<div class="item cartao"><img class="ic" src="${ITENS[item].icone}"><h3>${def.nome}</h3><div class="desc">${ITENS[item].desc}</div>
      <div class="preco"><img src="/assets/ui/ic_bloco.png">${def.preco} peças</div><div class="compradores">${botoes}</div></div>`;
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
      bandeiras.length ? `<img src="/assets/ui/bandeira_${cor}.png">${pegas}/${bandeiras.length}` : '',
      fx & 8 ? `<img src="${ITENS.mola.icone}">` : '',
      fx & 16 ? `<img src="${ITENS.planador.icone}">` : '',
    ].join(' ');
    return `<div class="time ${n === 0 ? 'morto' : ''}" style="border-left-color:${CORES[cor]}">
      <img class="ret ${dono?.ativo === p.id ? '' : 'inativo'}" style="border-color:${CORES[cor]}" src="/assets/personagens/${p.id}/retrato.png">
      <div class="nome" style="color:${CORES[cor]}">${NOME_TIME[cor]} <small>· ${dono ? dono.nome : '—'}</small></div>
      <div class="cors">${coracoes(n, max)}</div><div class="extras">${extras}</div></div>`;
  }).join('');
  if ($('hudTimes').dataset.h !== html) { $('hudTimes').innerHTML = html; $('hudTimes').dataset.h = html; }
  $('hudPecas').textContent = s.pecas;
  $('hudTempo').textContent = fmtTempo(s.tempo);
  $('hudFase').textContent = `${fase.id} · ${fase.nome}`;
}

// Nome do jogador em cima do personagem que ele está controlando.
function atualizarRotulos(s) {
  if (!fase || !s) { $('rotulos').innerHTML = ''; return; }
  $('rotulos').innerHTML = fase.personagens.map((p, i) => {
    const dono = donoDe(p.id);
    if (!dono || dono.ativo !== p.id) return '';
    const pos = cena.projetar(s.ch[i][0], s.ch[i][1] - 2.15);
    return `<div class="rotulo" style="left:${pos.x}px;top:${pos.y}px;background:${CORES[corDe(p.id)]}">${dono.nome}</div>`;
  }).join('');
}

function balao(x, y, texto, cor) {
  const pos = cena.projetar(x, y);
  const div = document.createElement('div');
  div.className = 'balao';
  Object.assign(div.style, { left: pos.x + 'px', top: pos.y + 'px', borderColor: CORES[cor] });
  div.innerHTML = `<img src="/assets/personagens/${COR_PERS[cor]}/retrato.png">${texto}`;
  $('baloes').append(div);
  setTimeout(() => div.remove(), 1700);
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
  const p = sala.placar;
  const venceu = sala.resultado === 'vitoria';
  const ultima = sala.faseIdx === sala.fases.length - 1;
  const bandeiras = p ? Object.entries(p.gemas).filter(([cor]) => cor !== 'peca').map(([cor, g]) =>
    `<span><img src="/assets/ui/bandeira_${cor}.png">${g.pegas}/${g.total}</span>`).join('') : '';
  const placar = `<div class="placar"><span>⏱ ${fmtTempo(p?.tempo || 0)}</span>${bandeiras}
    <span><img src="/assets/ui/ic_bloco.png">+${sala.ultimoGanho} peças</span></div>`;
  const botoes = `<div class="acoes">
      <button class="btn grande ${venceu ? '' : 'rosa'}" data-acao="continuar">${venceu ? (ultima ? 'Concluir mundo' : 'Próxima fase') : 'Tentar de novo'}</button>
      <button class="btn claro" data-acao="lobby">Menu</button></div>
    <div class="dica">ENTER continua · ESC volta ao menu · a equipe tem ${sala.carteira} peças para a oficina</div>`;
  const semCoracao = fase?.personagens.filter((q, i) => ultimoEstado?.cor?.[i]?.[0] === 0).map(q => q.id) || [];
  $('painelFim').innerHTML = venceu
    ? `<img class="selo" src="/assets/ui/ic_trofeu.png"><h2>Missão cumprida!</h2><div class="sub">Trabalho em equipe!</div>${placar}${botoes}`
    : `<h2>Tente de novo!</h2>
       <div class="derrotados">${(semCoracao.length ? semCoracao : mortos.slice(-1)).map(id => `<img src="/assets/personagens/${id}/derrota.png">`).join('')}</div>
       <div class="sub">${semCoracao.map(id => NOME_TIME[corDe(id)]).join(' e ')} ficou sem corações. Na oficina dá para montar corações extras!</div>
       ${placar}${botoes}`;
  for (const b of $('painelFim').querySelectorAll('[data-acao]')) b.onclick = () => { tocar('clique'); rede.enviar({ t: b.dataset.acao }); };
}

function mundoCompleto() {
  const div = document.createElement('div');
  div.className = 'balao';
  Object.assign(div.style, { left: '50%', top: '30%', fontSize: '4vh', padding: '2vh 3vw', borderColor: CORES.amarelo });
  div.innerHTML = '<img src="/assets/ui/ic_medalha.png" style="height:8vh;border-radius:0">Mundo 1 completo! Parabéns, equipe!';
  document.body.append(div);
  setTimeout(() => div.remove(), 4000);
}

function atualizarTudo() {
  const est = sala.estado;
  $('lobby').classList.toggle('oculto', est !== 'lobby');
  $('loja').classList.toggle('oculto', est !== 'loja');
  $('roboeduc').classList.toggle('oculto', est !== 'lobby' && est !== 'loja');
  $('hud').classList.toggle('oculto', !['contagem', 'jogando', 'fim'].includes(est));
  $('fim').classList.toggle('oculto', est !== 'fim');
  if (est === 'lobby') atualizarLobby();
  if (est === 'loja') atualizarLoja();
  if (est === 'fim') mostrarFim();
  $('hudTimes').dataset.h = '';
}

// ---------- teclado ----------
const TECLAS = {
  esq: ['ArrowLeft', 'KeyA'], dir: ['ArrowRight', 'KeyD'],
  pulo: ['ArrowUp', 'KeyW', 'Space'], acao: ['ArrowDown', 'KeyS', 'KeyE'],
};
const apertadas = new Set();
let ultimaEnviada = '';
function enviarEntrada() {
  const e = {};
  for (const [k, cods] of Object.entries(TECLAS)) e[k] = cods.some(c => apertadas.has(c));
  const s = JSON.stringify(e);
  if (s !== ultimaEnviada) { ultimaEnviada = s; rede.enviar({ t: 'entrada', ...e }); }
}
addEventListener('keydown', ev => {
  liberarAudio();
  if (ev.code === 'Tab') { ev.preventDefault(); if (!ev.repeat) rede.enviar({ t: 'trocar' }); return; }
  if (ev.code === 'KeyQ' && !ev.repeat) { rede.enviar({ t: 'trocar' }); return; }
  if (ev.code === 'Enter' && !ev.repeat) {
    if (sala.estado === 'lobby') { if (!meuId) entrar(); else rede.enviar({ t: 'loja' }); }
    else if (sala.estado === 'loja') rede.enviar({ t: 'jogar' });
    else if (sala.estado === 'fim') rede.enviar({ t: 'continuar' });
    return;
  }
  if (ev.code === 'Escape' && (sala.estado === 'fim' || sala.estado === 'loja')) { rede.enviar({ t: 'lobby' }); return; }
  if (Object.values(TECLAS).flat().includes(ev.code)) ev.preventDefault();
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
  if (s && fase && s.ch.length === fase.personagens.length) {
    cena.aplicarEstado(s);
    if (s !== ultimoEstado) { atualizarHud(s); ultimoEstado = s; }
    if (emJogo) atualizarRotulos(s);
  }
  if (emJogo) cena.quadro(dt);
  requestAnimationFrame(laco);
}
requestAnimationFrame(laco);
