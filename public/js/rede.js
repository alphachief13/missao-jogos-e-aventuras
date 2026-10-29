// Rede sem servidor: a tela do jogo é a anfitriã (roda a Sala no navegador) e os celulares
// se ligam direto nela por WebRTC (PeerJS). O código da sala vai no QR code: controle.html?sala=ABCD.
// PeerJS vem de vendor/peerjs/peerjs.min.js (variável global Peer); só a "apresentação" passa pela internet.
import { Sala } from '../jogo/sala.js';

const PREFIXO = 'missao-jogos-aventuras-';
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const novoCodigo = () => Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
export const codigoDaUrl = () => (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Tela anfitriã: cria a sala, liga a própria tela por um canal local e aceita celulares/outros PCs.
// aoMudar(ok) avisa se a sala está visível na internet (sem isso, só esta tela joga).
export function hospedar(aoReceber, aoMudar = () => {}) {
  const sala = new Sala();
  // canal local: entrega assíncrona, como numa rede de verdade
  const local = sala.conectar(texto => queueMicrotask(() => aoReceber(JSON.parse(texto))));
  const api = { enviar: m => local.receber(JSON.stringify(m)), codigo: null, aoCodigo: () => {} };

  let codigo = null;
  try { codigo = localStorage.getItem('mja_sala'); } catch {}
  function abrir() {
    codigo ||= novoCodigo();
    const peer = new Peer(PREFIXO + codigo);
    peer.on('open', () => {
      try { localStorage.setItem('mja_sala', codigo); } catch {}
      api.codigo = codigo; api.aoCodigo(codigo); aoMudar(true);
    });
    peer.on('connection', conn => {
      let cli = null;
      conn.on('open', () => { cli = sala.conectar(texto => conn.open && conn.send(texto)); });
      conn.on('data', texto => cli?.receber(texto));
      conn.on('close', () => cli?.fechar());
      conn.on('error', () => cli?.fechar());
    });
    peer.on('disconnected', () => { aoMudar(false); setTimeout(() => !peer.destroyed && peer.reconnect(), 2000); });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') { peer.destroy(); codigo = null; abrir(); return; } // código em uso: outro
      if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
        aoMudar(false);
        if (peer.destroyed || !peer.open) { peer.destroy(); setTimeout(abrir, 3000); }
      }
    });
  }
  abrir();
  return api;
}

// Celular ou outro PC: entra na sala de uma tela anfitriã, com reconexão automática.
export function entrarNaSala(codigo, aoReceber, aoMudar = () => {}) {
  let conn = null, fila = [];
  const api = {
    enviar(m) { const s = JSON.stringify(m); conn?.open ? conn.send(s) : fila.push(s); },
  };
  const peer = new Peer();
  let tentando = false;
  function ligar() {
    if (tentando || peer.destroyed) return;
    tentando = true;
    conn = peer.connect(PREFIXO + codigo, { serialization: 'raw', reliable: true });
    conn.on('open', () => { tentando = false; aoMudar(true); for (const s of fila) conn.send(s); fila = []; });
    conn.on('data', texto => aoReceber(JSON.parse(texto)));
    conn.on('close', () => { tentando = false; aoMudar(false); setTimeout(ligar, 1500); });
  }
  peer.on('open', ligar);
  peer.on('disconnected', () => setTimeout(() => !peer.destroyed && peer.reconnect(), 2000));
  peer.on('error', err => {
    // sala não encontrada (tela fechada ou código errado) ou queda: tenta de novo
    if (err.type === 'peer-unavailable') { tentando = false; aoMudar(false, 'sala'); setTimeout(ligar, 2500); }
    else if (!peer.open) aoMudar(false);
  });
  return api;
}

// Estados recebidos 30x/s: guarda alguns e interpola com ~70 ms de atraso para ficar suave.
export class Interpolador {
  constructor(atraso = 70) { this.buf = []; this.atraso = atraso; }
  limpar() { this.buf = []; }
  chegou(s) { this.buf.push({ t: performance.now(), s }); if (this.buf.length > 20) this.buf.shift(); }
  agora() {
    const b = this.buf;
    if (!b.length) return null;
    const alvo = performance.now() - this.atraso;
    let i = b.length - 1;
    while (i > 0 && b[i - 1].t > alvo) i--;
    if (i === 0 || b[i].t <= alvo) return b[Math.max(0, i)].s;
    const a = b[i - 1], c = b[i];
    const k = Math.min(1, Math.max(0, (alvo - a.t) / (c.t - a.t)));
    const lerp = (x, y) => x + (y - x) * k;
    return {
      ...c.s,
      ch: c.s.ch.map((p, j) => {
        const q = a.s.ch[j];
        return q ? [lerp(q[0], p[0]), lerp(q[1], p[1]), ...p.slice(2)] : p;
      }),
      plat: c.s.plat.map((p, j) => { const q = a.s.plat[j]; return q ? [lerp(q[0], p[0]), lerp(q[1], p[1])] : p; }),
    };
  }
}
