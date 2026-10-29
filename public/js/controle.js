// Controle virtual no celular: escolhe o time, monta itens na oficina e vira gamepad durante a partida.
import { entrarNaSala, codigoDaUrl } from './rede.js';
import { PERSONAGENS, CORES, PERS_COR, COR_PERS, NOME_TIME, ICONE, ITENS } from './comum.js';

const $ = id => document.getElementById(id);

let sala = { estado: 'lobby', jogadores: [], fases: [], times: [] };
let meuId = null;
let entrei = false;
let fase = null;
let coracoes = null; // [[n, max], ...] na ordem de fase.personagens

function receber(m) {
  if (m.t === 'oi' || m.t === 'sala') { sala = m; atualizar(); }
  else if (m.t === 'voce') { meuId = m.id; try { localStorage.setItem('mja_nome', $('nome').value); } catch {} atualizar(); }
  else if (m.t === 'fase') fase = m.fase;
  else if (m.t === 's') {
    if (JSON.stringify(m.cor) !== JSON.stringify(coracoes)) { coracoes = m.cor; desenharTopo(); }
  }
  else if (m.t === 'cheio') $('msgNome').textContent = 'A sala já está cheia (4 jogadores).';
  else if (m.t === 'ev' && m.e === 'morte' && eu()?.pers.includes(m.id)) navigator.vibrate?.([80, 60, 160]);
  else if (m.t === 'ev' && (m.e === 'bandeira' || m.e === 'peca')) navigator.vibrate?.(25);
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
$('btnJogar').onclick = () => rede.enviar({ t: 'jogar' });
$('btnContinuar').onclick = () => rede.enviar({ t: 'continuar' });
$('btnMenu').onclick = () => rede.enviar({ t: 'lobby' });
for (const el of document.querySelectorAll('.ctl')) el.style.backgroundImage = `url("${ICONE[el.dataset.k]}")`;

function telaCheia() {
  const el = document.documentElement;
  (el.requestFullscreen?.() || Promise.resolve()).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
}

function mostrar(id) { for (const p of ['pgNome', 'pgLobby', 'pgLoja', 'jogo', 'pgFim']) $(p).classList.toggle('oculto', p !== id); }

function atualizar() {
  const j = eu();
  if (!j) return mostrar('pgNome');
  if (sala.estado === 'lobby') {
    mostrar('pgLobby');
    $('cards').innerHTML = PERSONAGENS.map(p => {
      const cor = PERS_COR[p];
      const dono = sala.jogadores.find(x => x.pers.includes(p));
      return `<div data-p="${p}" class="${dono ? '' : 'livre'} ${dono?.id === meuId ? 'meu' : ''}">
        <div class="faixa" style="background:${CORES[cor]}">${NOME_TIME[cor].toUpperCase()}</div>
        <div class="arte"><img src="assets/personagens/${p}/arte.png"></div><small>${dono ? dono.nome : 'Livre'}</small></div>`;
    }).join('');
    for (const d of $('cards').children) d.onclick = () => rede.enviar({ t: 'escolher', pers: d.dataset.p });
    const f = sala.fases[sala.faseIdx];
    $('msgLobby').textContent = f ? `Fase ${f.id} · ${f.nome} · ${f.coracoes} corações por time` : '';
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
let ultimo = '';
let antes = new Set();
function lerToques(e) {
  e.preventDefault();
  const agora = new Set();
  for (const t of e.touches) {
    const el = document.elementFromPoint(t.clientX, t.clientY)?.closest('.ctl');
    if (el) agora.add(el.dataset.k);
  }
  if (agora.has('trocar') && !antes.has('trocar')) rede.enviar({ t: 'trocar' });
  antes = agora;
  for (const el of document.querySelectorAll('.ctl')) el.classList.toggle('on', agora.has(el.dataset.k));
  const ent = { esq: agora.has('esq'), dir: agora.has('dir'), pulo: agora.has('pulo'), acao: agora.has('acao') };
  const s = JSON.stringify(ent);
  if (s !== ultimo) { ultimo = s; rede.enviar({ t: 'entrada', ...ent }); navigator.vibrate?.(8); }
}
for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) $('jogo').addEventListener(ev, lerToques, { passive: false });
// Mouse (para testar no PC)
$('jogo').addEventListener('mousedown', e => lerToques({ preventDefault() {}, touches: [e] }));
addEventListener('mouseup', () => { if (!$('jogo').classList.contains('oculto')) lerToques({ preventDefault() {}, touches: [] }); });
