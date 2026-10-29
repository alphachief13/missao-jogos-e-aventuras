// Conexão WebSocket com reconexão automática.
export function conectar(aoReceber, aoMudar = () => {}) {
  let ws, fila = [];
  const api = {
    enviar(m) { const s = JSON.stringify(m); ws?.readyState === 1 ? ws.send(s) : fila.push(s); },
    aoAbrir: () => {},
  };
  function abrir() {
    ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = () => { aoMudar(true); for (const s of fila) ws.send(s); fila = []; api.aoAbrir(); };
    ws.onmessage = e => aoReceber(JSON.parse(e.data));
    ws.onclose = () => { aoMudar(false); setTimeout(abrir, 1000); };
  }
  abrir();
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
