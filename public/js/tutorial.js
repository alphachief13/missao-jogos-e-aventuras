// Tutorial "Como jogar": janela com passo a passo de cada modo (plataforma 2D e mapa 3D isométrico)
// e o botão do treino jogável (dispara o evento 'treinar'; a tela do jogo responde com detail.ok = true).
// Independente do resto da tela: qualquer botão com data-tutorial abre a janela (data-tutorial="iso" abre no 3D).
// Enquanto aberta, segura o teclado (← → Esc Enter) para não mexer no menu por trás.
import { ICONE } from './comum.js';

const P = 'assets/personagens';
const tecla = t => `<kbd>${t}</kbd>`;
const bolinha = (icone, cor) => `<span class="tut-bot" style="--cor:${cor}"><img src="${ICONE[icone]}" alt=""></span>`;
// primeiro quadro de uma tira de sprites (células 384×384)
const sprite = (src, quadros = 1, extra = '') =>
  `<span class="tut-sprite ${extra}" style="background-image:url('${src}');background-size:${quadros * 100}% 100%"></span>`;
const poca = cor => `<span class="tut-poca" style="--cor:${cor}"></span>`;

const MODOS = {
  plataforma: {
    nome: 'Plataforma 2D', sub: 'Mundo 1 · Exploradores em Ação', selo: 'assets/kit/selo_1.png',
    passos: [
      { t: 'A missão', d: 'Cada time leva seu personagem até o <b>arco de chegada da sua cor</b>. A fase só termina quando <b>todos</b> chegam!',
        arte: `<div class="tut-linha">${['ruivo', 'loira', 'cacheado', 'sapo'].map(p => sprite(`${P}/${p}/vitoria.png`)).join('')}</div>` },
      { t: 'Controles', d: 'No computador use as setas (ou W A S D). No celular, os botões redondos.',
        arte: `<div class="tut-controles">
          <div><span>Andar</span>${tecla('←')}${tecla('→')}${bolinha('esq', '#3E93D0')}${bolinha('dir', '#3E93D0')}</div>
          <div><span>Pular</span>${tecla('↑')}${bolinha('pulo', '#3E93D0')}</div>
          <div><span>Ação</span>${tecla('↓')}${bolinha('acao', '#3E93D0')}<small>alavancas e empurrar</small></div>
          <div><span>Trocar</span>${tecla('Tab')}${bolinha('trocar', '#3E93D0')}<small>jogando sozinho</small></div></div>` },
      { t: 'Poças de tinta', d: 'Cada time só atravessa a poça da <b>sua cor</b>. A poça com raio dá curto-circuito em <b>todo mundo</b>: pule por cima!',
        arte: `<div class="tut-linha">${poca('#3E93D0')}${poca('#E3205D')}${poca('#F6BB33')}${poca('#A0C630')}<span class="tut-poca curto"><img src="${ICONE.acao}" alt=""></span></div>` },
      { t: 'Trabalho em equipe', d: 'Botões e alavancas abrem portões e mexem elevadores. Um amigo <b>segura o botão</b> enquanto o outro passa.',
        arte: `<div class="tut-linha">${sprite(`${P}/cacheado/empurrar.png`)}<img class="tut-ic" src="assets/ui/ic_engrenagem.png" alt="">${sprite(`${P}/loira/aceno.png`)}</div>` },
      { t: 'Corações', d: 'Cair na poça errada custa <b>1 coração</b> e o personagem volta um pouco atrás. Sem corações, a equipe tenta a fase de novo.',
        arte: `<div class="tut-linha"><span class="tut-cors">${[1, 1, 1, 0].map(c => `<img src="${c ? ICONE.coracao : ICONE.coracaoVazio}" alt="">`).join('')}</span>${sprite(`${P}/ruivo/derrota.png`)}</div>` },
      { t: 'Peças e oficina', d: 'Juntem <b>peças de montar</b> e a <b>bandeirinha</b> do time. Na oficina, as peças viram coração extra, tênis de mola ou planador.',
        arte: `<div class="tut-linha"><img class="tut-ic" src="assets/ui/ic_bloco.png" alt=""><img class="tut-ic" src="assets/ui/bandeira_azul.png" alt="">
          <span class="tut-seta">→</span><img class="tut-ic" src="${ICONE.coracao}" alt=""><img class="tut-ic" src="${ICONE.mola}" alt=""><img class="tut-ic" src="${ICONE.planador}" alt=""></div>` },
    ],
  },
  iso: {
    nome: 'Mapa 3D', sub: 'Mundo 2 · Desafio dos Construtores', selo: 'assets/kit/selo_2.png',
    passos: [
      { t: 'Um mapa para explorar', d: 'No Mundo 2 a câmera fica no alto. A equipe anda <b>para todos os lados</b> e completa as missões espalhadas pelo canteiro.',
        arte: `<div class="tut-linha tut-iso">${sprite(`${P}/ruivo/iso/frente_idle.png`, 2, 'iso')}${sprite(`${P}/ruivo/iso/costas_corrida.png`, 4, 'iso')}</div>` },
      { t: 'Controles', d: 'Agora as setas andam em 4 direções. No celular, arraste o dedo no lado esquerdo da tela.',
        arte: `<div class="tut-controles">
          <div><span>Andar</span>${tecla('↑')}${tecla('↓')}${tecla('←')}${tecla('→')}<small>ou W A S D</small></div>
          <div><span>Pular</span>${tecla('Espaço')}${bolinha('pulo', '#E3205D')}</div>
          <div><span>Ação</span>${tecla('E')}${bolinha('acao', '#E3205D')}<small>pegar, jogar, ajudar</small></div></div>` },
      { t: 'Blocos de montar', d: 'Perto de um bloco, aperte <b>Ação</b> para pegar. Aperte de novo para jogar: ele voa por cima de muros e rios e cai no <b>encaixe</b>.',
        arte: `<div class="tut-linha"><span class="tut-bloco" style="--cor:#F6BB33"></span><span class="tut-seta">→</span><span class="tut-encaixe"></span></div>` },
      { t: 'Chão colorido', d: 'O chão pintado é como as poças: <b>só o time da cor</b> pisa nele. Para os outros é parede.',
        arte: `<div class="tut-linha tut-chao">${['#3E93D0', '#E3205D', '#F6BB33', '#A0C630'].map(c => `<span style="--cor:${c}"></span>`).join('')}</div>` },
      { t: 'Ajude os amigos', d: 'Quem cai na água fica sentado na margem. Um colega chega perto e aperta <b>Ação</b> para levantar. Sem ajuda, levanta sozinho, mas perde 1 coração.',
        arte: `<div class="tut-linha">${sprite(`${P}/sapo/aceno.png`)}<span class="tut-seta">♥</span>${sprite(`${P}/cacheado/derrota.png`)}</div>` },
      { t: 'A grande torre', d: 'Completem as 4 missões para abrir a <b>grande torre</b>. Aqui não tem derrota: é só não desistir!',
        arte: `<div class="tut-linha"><img class="tut-ic grande" src="assets/ui/ic_trofeu.png" alt="">${sprite(`${P}/loira/vitoria.png`)}</div>` },
    ],
  },
};

const raiz = document.createElement('div');
raiz.className = 'tut oculto';
raiz.innerHTML = `<div class="tut-janela" role="dialog" aria-modal="true" aria-label="Como jogar">
  <header><h2>Como jogar</h2><button class="tut-fechar" aria-label="Fechar">×</button></header>
  <nav class="tut-abas">${Object.entries(MODOS).map(([k, m]) =>
    `<button data-modo="${k}"><img src="${m.selo}" alt=""><span><b>${m.nome}</b><small>${m.sub}</small></span></button>`).join('')}</nav>
  <div class="tut-treinar"></div>
  <div class="tut-slide"></div>
  <footer><button class="btn claro" data-ir="-1">← Anterior</button><div class="tut-pontos"></div><button class="btn" data-ir="1">Próximo →</button></footer>
</div>`;
document.body.append(raiz);
const $ = s => raiz.querySelector(s);

let modo = 'plataforma', passo = 0;
function desenhar() {
  const m = MODOS[modo], p = m.passos[passo], ultimo = passo === m.passos.length - 1;
  for (const b of raiz.querySelectorAll('.tut-abas button')) b.classList.toggle('sel', b.dataset.modo === modo);
  $('.tut-slide').innerHTML = `<div class="tut-arte">${p.arte}</div>
    <div class="tut-texto"><div class="tut-num">${passo + 1} de ${m.passos.length}</div><h3>${p.t}</h3><p>${p.d}</p></div>`;
  $('.tut-pontos').innerHTML = m.passos.map((_, i) => `<button class="${i === passo ? 'sel' : ''}" data-i="${i}" aria-label="Passo ${i + 1}"></button>`).join('');
  $('.tut-treinar').innerHTML = `<div><b>Aprenda jogando!</b><span>${modo === 'iso'
      ? 'Um mapa 3D pequeno com cada objetivo na tela: blocos, chão colorido, ajudar o amigo e obra em equipe.'
      : 'Uma fase de treino em que cada objetivo aparece na tela.'} Não perde corações.</span></div>
    <button class="btn" data-treinar>▶ Treinar ${modo === 'iso' ? 'o mapa 3D' : 'agora'}</button>`;
  $('[data-ir="-1"]').disabled = passo === 0;
  const prox = $('[data-ir="1"]');
  prox.textContent = !ultimo ? 'Próximo →' : modo === 'plataforma' ? 'Ver o mapa 3D →' : 'Entendi!';
}
function ir(d) {
  const n = MODOS[modo].passos.length;
  if (passo + d >= n) { if (modo === 'plataforma') { modo = 'iso'; passo = 0; desenhar(); } else fechar(); return; }
  passo = Math.max(0, passo + d);
  desenhar();
}

export function abrirTutorial(m = 'plataforma') {
  modo = MODOS[m] ? m : 'plataforma';
  passo = 0;
  desenhar();
  raiz.classList.remove('oculto');
}
export function fechar() { raiz.classList.add('oculto'); }

raiz.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (e.target === raiz || b?.classList.contains('tut-fechar')) return fechar();
  if (!b) return;
  if (b.dataset.treinar !== undefined) {
    const ev = new CustomEvent('treinar', { detail: { ok: false, modo: modo === 'iso' ? 'iso' : 'lado' } });
    dispatchEvent(ev);
    if (ev.detail.ok) fechar();
    else $('.tut-treinar span').textContent = 'O treino começa pela tela do jogo (TV ou computador): é só apertar lá!';
    return;
  }
  if (b.dataset.modo) { modo = b.dataset.modo; passo = 0; desenhar(); }
  else if (b.dataset.ir) ir(+b.dataset.ir);
  else if (b.dataset.i) { passo = +b.dataset.i; desenhar(); }
});
// captura antes da tela: com o tutorial aberto, o teclado só mexe nele
addEventListener('keydown', e => {
  if (raiz.classList.contains('oculto')) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  if (e.code === 'Escape') fechar();
  else if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space') ir(1);
  else if (e.code === 'ArrowLeft') ir(-1);
}, true);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tutorial]');
  if (b) abrirTutorial(b.dataset.tutorial || 'plataforma');
});
