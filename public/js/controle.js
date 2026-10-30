// Controle virtual no celular: escolhe o time, monta itens na oficina e vira gamepad durante a partida.
import { entrarNaSala, codigoDaUrl, Interpolador } from './rede.js';
import { PERSONAGENS, CORES, PERS_COR, COR_PERS, NOME_TIME, ICONE, ITENS, bussola, SETA } from './comum.js';

const $ = id => document.getElementById(id);

let sala = { estado: 'lobby', jogadores: [], fases: [], times: [] };
let meuId = null;
let entrei = false;
let fase = null;
let coracoes = null; // [[n, max], ...] na ordem de fase.personagens

function receber(m) {
  if (m.t === 'oi' || m.t === 'sala') { sala = m; atualizar(); }
  else if (m.t === 'voce') { meuId = m.id; try { localStorage.setItem('mja_nome', $('nome').value); } catch {} atualizar(); }
  else if (m.t === 'fase') { fase = m.fase; carregarIso(); }
  else if (m.t === 's') {
    if (m.iso) interp.chegou(m);
    if (JSON.stringify(m.cor) !== JSON.stringify(coracoes)) { coracoes = m.cor; desenharTopo(); }
  }
  else if (m.t === 'cheio') $('msgNome').textContent = 'A sala já está cheia (4 jogadores).';
  else if (m.t === 'ev' && m.e === 'morte' && eu()?.pers.includes(m.id)) navigator.vibrate?.([80, 60, 160]);
  else if (m.t === 'ev' && (m.e === 'bandeira' || m.e === 'peca')) navigator.vibrate?.(25);
  else if (m.t === 'ev' && m.e === 'caiu' && eu()?.pers.includes(m.id)) navigator.vibrate?.([60, 40, 60]);
  if (m.t === 'ev' && cenaIso && fase?.modo === 'iso') cenaIso.efeito(m);
}

// ---------- Mundo 2: o celular desenha o próprio jogo, com a câmera no seu personagem ----------
const interp = new Interpolador();
let cenaIso = null;
async function carregarIso() {
  interp.limpar();
  $('jogo').classList.toggle('iso', fase?.modo === 'iso');
  if (fase?.modo !== 'iso') return;
  if (!cenaIso) {
    const { CenaIso } = await import('./cena_iso.js');
    cenaIso ??= new CenaIso($('cenaCel'), { celular: true });
  }
  cenaIso.carregarFase(fase);
}
let antesQuadro = performance.now();
function laco(agora) {
  const dt = Math.min(0.05, (agora - antesQuadro) / 1000);
  antesQuadro = agora;
  const j = eu();
  if (cenaIso && fase?.modo === 'iso' && j && !$('jogo').classList.contains('oculto')) {
    const s = interp.agora();
    if (s?.iso && s.ch.length === fase.personagens.length) {
      cenaIso.aplicarEstado(s);
      desenharBussola(s, j);
    }
    cenaIso.seguir([j.ativo]);
    cenaIso.quadro(dt);
  }
  requestAnimationFrame(laco);
}
requestAnimationFrame(laco);

let bussolaHtml = '';
function desenharBussola(s, j) {
  const b = bussola(fase, s, fase.personagens.findIndex(p => p.id === j.ativo));
  const html = b ? `<span class="seta">${SETA}</span><span>Missão ${b.numero} · ${b.m.nome} <small>${b.m.dica}</small></span>`
                 : '<span class="seta">✓</span><span>Todas as missões feitas!</span>';
  if (html !== bussolaHtml) { $('bussola').innerHTML = html; bussolaHtml = html; }
  const svg = $('bussola').querySelector('svg');
  if (svg && b) svg.style.transform = `rotate(${b.angulo}deg)`;
}

// Liga na tela anfitriã pelo código (vem no QR code; sem ele, a pessoa digita).
let rede = null;
function ligar(codigo) {
  history.replaceState(null, '', '?sala=' + codigo);
  rede = entrarNaSala(codigo, receber, (ok, motivo) => {
    $('msgNome').textContent = ok ? '' : motivo === 'sala' ? `Procurando a sala ${codigo}… a tela do jogo está aberta?` : 'Conectando…';
    // Ao reconectar, a tela esqueceu este celular: entra de novo com o mesmo nome.
    if (ok && entrei) { meuId = null; rede.enviar({ t: 'entrar', tipo: 'celular', nome: $('nome').value }); }
  });
}
if (codigoDaUrl()) ligar(codigoDaUrl());
else $('codigo').classList.remove('oculto');

const eu = () => sala.jogadores.find(j => j.id === meuId);

try { $('nome').value = localStorage.getItem('mja_nome') || ''; } catch {}
$('btnEntrar').onclick = () => {
  if (!rede) {
    const codigo = $('codigo').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (codigo.length !== 4) { $('msgNome').textContent = 'Digite o código de 4 letras que aparece na tela do jogo.'; return; }
    $('codigo').classList.add('oculto');
    ligar(codigo);
  }
  entrei = true;
  rede.enviar({ t: 'entrar', tipo: 'celular', nome: $('nome').value });
  telaCheia();
};
$('nome').onkeydown = e => { if (e.key === 'Enter') $('btnEntrar').click(); };
$('btnLoja').onclick = () => rede.enviar({ t: 'loja' });
$('btnIrFase').onclick = () => rede.enviar({ t: 'etapa', etapa: 'fase' });
$('btnVoltarTimes').onclick = () => rede.enviar({ t: 'etapa', etapa: 'times' });
$('btnLojaVoltar').onclick = () => rede.enviar({ t: 'lobby' });
$('btnJogar').onclick = () => rede.enviar({ t: 'jogar' });
$('btnContinuar').onclick = () => rede.enviar({ t: 'continuar' });
$('btnMenu').onclick = () => rede.enviar({ t: 'lobby' });
$('btnRetomar').onclick = () => rede.enviar({ t: 'retomar' });
$('btnReiniciar').onclick = () => rede.enviar({ t: 'reiniciar' });
$('btnPausaLoja').onclick = () => rede.enviar({ t: 'sairFase', para: 'loja' });
$('btnPausaMenu').onclick = () => rede.enviar({ t: 'sairFase', para: 'lobby' });
// o botão de pausa fica dentro do controle: o toque não pode virar movimento
for (const ev of ['touchstart', 'mousedown']) $('btnPausa').addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); rede.enviar({ t: 'pausar' }); }, { passive: false });
for (const el of document.querySelectorAll('.ctl')) el.style.backgroundImage = `url("${ICONE[el.dataset.k]}")`;

function telaCheia() {
  const el = document.documentElement;
  (el.requestFullscreen?.() || Promise.resolve()).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
}

function mostrar(id) { for (const p of ['pgNome', 'pgTimes', 'pgFase', 'pgLoja', 'jogo', 'pgFim', 'pgPausa']) $(p).classList.toggle('oculto', p !== id); }

function atualizar() {
  const j = eu();
  if (!j) return mostrar('pgNome');
  if (sala.estado === 'lobby' && sala.etapa === 'fase') {
    mostrar('pgFase');
    $('fasesCel').innerHTML = sala.fases.map((f, i) =>
      `<button data-i="${i}" class="${i === sala.faseIdx ? 'sel' : ''}" ${i >= sala.liberadas ? 'disabled' : ''}><b>${i < sala.liberadas ? f.id : '🔒'}</b>${f.nome}</button>`).join('');
    for (const b of $('fasesCel').children) b.onclick = () => rede.enviar({ t: 'escolherFase', idx: +b.dataset.i });
    const f = sala.fases[sala.faseIdx];
    $('msgFase').textContent = `${f.coracoes} corações por time · ${f.dica}`;
  } else if (sala.estado === 'lobby') {
    mostrar('pgTimes');
    $('cards').innerHTML = PERSONAGENS.map(p => {
      const cor = PERS_COR[p];
      const dono = sala.jogadores.find(x => x.pers.includes(p));
      return `<div data-p="${p}" class="${dono ? '' : 'livre'} ${dono?.id === meuId ? 'meu' : ''}">
        <div class="faixa" style="background:${CORES[cor]}">${NOME_TIME[cor].toUpperCase()}</div>
        <div class="arte"><img src="assets/personagens/${p}/arte.png"></div><small>${dono ? dono.nome : 'Livre'}</small></div>`;
    }).join('');
    for (const d of $('cards').children) d.onclick = () => rede.enviar({ t: 'escolher', pers: d.dataset.p });
  } else if (sala.estado === 'loja') {
    mostrar('pgLoja');
    $('carteira').textContent = sala.carteira;
    const f = sala.fases[sala.faseIdx];
    $('msgLoja').textContent = `Próxima: ${f.id} · ${f.nome} (${f.coracoes} corações por time)`;
    const meus = j.pers.map(p => PERS_COR[p]);
    $('itens').innerHTML = Object.entries(sala.loja).map(([item, def]) => `<div class="item cartao"><img class="ic" src="${ITENS[item].icone}">
      ${def.nome}<div class="preco"><img src="assets/ui/ic_bloco.png">${def.preco}</div>
      ${meus.map(cor => {
        const qt = sala.compras[cor]?.[item] || 0;
        const cheio = qt >= def.max;
        const pode = !cheio && sala.carteira >= def.preco;
        return `<button class="${cheio ? 'cheio' : ''}" style="background:${CORES[cor]}" data-item="${item}" data-cor="${cor}" ${pode ? '' : 'disabled'}>
          <img src="assets/personagens/${COR_PERS[cor]}/retrato.png">${qt ? (def.max > 1 ? qt + '×' : '✓') : 'Montar'}</button>`;
      }).join('')}</div>`).join('');
    for (const b of $('itens').querySelectorAll('button')) b.onclick = () => rede.enviar({ t: 'comprar', item: b.dataset.item, cor: b.dataset.cor });
  } else if (sala.pausado) {
    mostrar('pgPausa');
    $('pausaQuem').textContent = `${sala.pausado} pausou · a partida está parada para todos`;
    $('pausaTutorial').dataset.tutorial = fase?.modo === 'iso' ? 'iso' : 'plataforma';
    ultimo = ''; antes = new Set();
    for (const el of document.querySelectorAll('.ctl')) el.classList.remove('on');
  } else if (sala.estado === 'fim') {
    mostrar('pgFim');
    const venceu = sala.resultado === 'vitoria';
    $('fimTitulo').textContent = venceu ? 'Missão cumprida!' : 'Tente de novo!';
    $('fimMsg').textContent = `+${sala.ultimoGanho} peças para a equipe (total ${sala.carteira})`;
    $('btnContinuar').textContent = venceu ? 'Próxima fase' : 'Tentar de novo';
  } else {
    mostrar('jogo');
    const cor = CORES[PERS_COR[j.ativo] || 'azul'];
    for (const el of document.querySelectorAll('.ctl')) el.style.setProperty('--cor', cor);
    $('joy').style.setProperty('--cor', cor);
    $('jogo').classList.toggle('iso', fase?.modo === 'iso');
    cenaIso?.redimensionar();
    $('ctlTrocar').style.visibility = j.pers.length > 1 ? 'visible' : 'hidden';
    desenharTopo();
  }
}

// Faixa de cima: time ativo, retratos e corações.
function desenharTopo() {
  const j = eu();
  if (!j || $('jogo').classList.contains('oculto')) return;
  const cor = PERS_COR[j.ativo] || 'azul';
  const i = fase?.personagens.findIndex(p => p.id === j.ativo) ?? -1;
  const [n, max] = (i >= 0 && coracoes?.[i]) || [0, 0];
  $('topo').style.background = CORES[cor];
  $('topo').innerHTML = `${j.pers.map(p => `<img class="r ${p === j.ativo ? '' : 'inativo'}" src="assets/personagens/${p}/retrato.png">`).join('')}
    <span>${NOME_TIME[cor]} · ${j.nome}</span>
    ${max ? `<span class="cor">${Array.from({ length: max }, (_, k) => `<img src="${k < n ? ICONE.coracao : ICONE.coracaoVazio}">`).join('')}</span>` : ''}`;
}

// ---------- multitoque: cada dedo aperta o botão que estiver embaixo dele ----------
// No Mundo 2, o dedo que encosta na metade esquerda vira joystick (a base aparece onde ele tocou).
let ultimo = '';
let antes = new Set();
const RAIO_JOY = 60;
let joy = null; // { id, x0, y0, jx, jy }
function posJoystick(x, y, x0 = x, y0 = y) {
  const base = $('joy').querySelector('.base'), pino = $('joy').querySelector('.pino');
  base.style.left = x0 + 'px'; base.style.top = y0 + 'px';
  pino.style.left = x + 'px'; pino.style.top = y + 'px';
}
function joystickParado() {
  $('joy').classList.add('dica');
  const x = Math.max(110, innerWidth * 0.17), y = innerHeight - Math.max(110, innerHeight * 0.3);
  posJoystick(x, y);
}
joystickParado();
addEventListener('resize', () => { if (!joy) joystickParado(); });
function lerJoystick(e) {
  const iso = fase?.modo === 'iso';
  if (!iso) { joy = null; return; }
  const lista = [...(e.touches || [])];
  if (joy && !lista.some(t => (t.identifier ?? 'mouse') === joy.id)) { joy = null; joystickParado(); }
  for (const t of lista) {
    const id = t.identifier ?? 'mouse';
    if (!joy && t.clientX < innerWidth * 0.45 && !document.elementFromPoint(t.clientX, t.clientY)?.closest('.ctl, button')) {
      joy = { id, x0: t.clientX, y0: t.clientY, jx: 0, jy: 0 };
      $('joy').classList.remove('dica');
    }
    if (joy && joy.id === id) {
      let dx = t.clientX - joy.x0, dy = t.clientY - joy.y0;
      const d = Math.hypot(dx, dy);
      if (d > RAIO_JOY) { dx *= RAIO_JOY / d; dy *= RAIO_JOY / d; }
      joy.jx = Math.round((dx / RAIO_JOY) * 20) / 20;
      joy.jy = Math.round((dy / RAIO_JOY) * 20) / 20;
      if (Math.hypot(joy.jx, joy.jy) < 0.2) joy.jx = joy.jy = 0; // zona morta
      posJoystick(joy.x0 + dx, joy.y0 + dy, joy.x0, joy.y0);
    }
  }
}
function lerToques(e) {
  e.preventDefault();
  lerJoystick(e);
  const agora = new Set();
  for (const t of e.touches) {
    if (joy && (t.identifier ?? 'mouse') === joy.id) continue;
    const el = document.elementFromPoint(t.clientX, t.clientY)?.closest('.ctl');
    if (el) agora.add(el.dataset.k);
  }
  if (agora.has('trocar') && !antes.has('trocar')) rede.enviar({ t: 'trocar' });
  antes = agora;
  for (const el of document.querySelectorAll('.ctl')) el.classList.toggle('on', agora.has(el.dataset.k));
  const ent = { esq: agora.has('esq'), dir: agora.has('dir'), pulo: agora.has('pulo'), acao: agora.has('acao'),
                jx: joy?.jx || 0, jy: joy?.jy || 0 };
  const s = JSON.stringify(ent);
  if (s !== ultimo) {
    const botoes = ultimo && JSON.stringify({ ...JSON.parse(ultimo), jx: 0, jy: 0 }) !== JSON.stringify({ ...ent, jx: 0, jy: 0 });
    ultimo = s;
    rede.enviar({ t: 'entrada', ...ent });
    if (botoes) navigator.vibrate?.(8);
  }
}
for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) $('jogo').addEventListener(ev, lerToques, { passive: false });
// Mouse (para testar no PC)
let mouseApertado = false;
$('jogo').addEventListener('mousedown', e => { mouseApertado = true; lerToques({ preventDefault() {}, touches: [e] }); });
addEventListener('mousemove', e => { if (mouseApertado && joy) lerToques({ preventDefault() {}, touches: [e] }); });
addEventListener('mouseup', () => { mouseApertado = false; if (!$('jogo').classList.contains('oculto')) lerToques({ preventDefault() {}, touches: [] }); });
