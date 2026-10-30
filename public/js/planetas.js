// Escolha de mundo: cada mundo é um mundinho redondo com a sua cara (árvores, blocos de montar, engrenagens,
// pista de gincana, troféus).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MUNDOS, ORDEM_MUNDOS } from './comum.js';

const R = 0.72;                   // raio do mundinho
const fosco = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, ...extra });
const brilho = (cor, extra = {}) => new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.3, clearcoat: 1, ...extra });

// Coloca um objeto em pé na superfície, na latitude/longitude dadas (graus).
function naSuperficie(planeta, obj, lat, lon, altura = 0) {
  const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon);
  const normal = new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
  obj.position.copy(normal).multiplyScalar(R + altura);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  planeta.add(obj);
}

// Textura do chão do mundinho: mar com manchas de terra (sementes fixas para sair sempre igual).
function texturaTerra({ mar, terra, terra2 }, semente) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = mar; g.fillRect(0, 0, 512, 256);
  let x = semente * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const cx = rnd() * 512, cy = 40 + rnd() * 176, r = 24 + rnd() * 50;
    g.fillStyle = i % 3 ? terra : terra2;
    g.beginPath(); g.ellipse(cx, cy, r * 1.4, r, rnd() * 3, 0, Math.PI * 2); g.fill();
    if (cx + r * 1.4 > 512) { g.beginPath(); g.ellipse(cx - 512, cy, r * 1.4, r, 0, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = terra; g.fillRect(0, 0, 512, 30); g.fillRect(0, 226, 512, 30); // polos
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const DETALHES = {
  arvores(p) {
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 6), fosco('#8B5A2B'));
      tronco.position.y = 0.04;
      const copa = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), fosco(i % 2 ? '#4F8F3F' : '#5FA34A'));
      copa.position.y = 0.17;
      g.add(tronco, copa);
      naSuperficie(p, g, -40 + (i * 37) % 85, i * 51, -0.01);
    }
    const bandeira = new THREE.Group();
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), fosco('#8B5A2B'));
    mastro.position.y = 0.18;
    const pano = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 3), brilho('#E3205D'));
    pano.rotation.z = -Math.PI / 2; pano.position.set(0.07, 0.31, 0);
    bandeira.add(mastro, pano);
    naSuperficie(p, bandeira, 80, 0);
  },
  blocos(p) {
    const cores = ['#3E93D0', '#E3205D', '#F6BB33', '#A0C630'];
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.08 + (i % 3) * 0.04, 0.11, 2, 0.02), brilho(cores[i % 4]));
      b.geometry.translate(0, 0.05, 0);
      naSuperficie(p, b, -45 + (i * 29) % 95, i * 47);
    }
    const grua = new THREE.Group();
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), brilho('#F6BB33'));
    torre.position.y = 0.21;
    const braco = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), brilho('#F6BB33'));
    braco.position.set(0.1, 0.42, 0);
    grua.add(torre, braco);
    naSuperficie(p, grua, 70, 30);
  },
  engrenagens(p) {
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const anel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 16), brilho(i % 2 ? '#93A4B8' : '#F6BB33', { metalness: 0.3 }));
      g.add(anel);
      for (let k = 0; k < 8; k++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.04), anel.material);
        const a = k * Math.PI / 4; d.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); d.rotation.z = a; g.add(d);
      }
      g.position.y = 0.1;
      const base = new THREE.Group(); base.add(g);
      base.userData.gira = g;
      naSuperficie(p, base, -40 + (i * 31) % 90, i * 67);
    }
    const antena = new THREE.Group();
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), fosco('#56677C'));
    haste.position.y = 0.15;
    const luz = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), brilho('#6FD3FF', { emissive: '#6FD3FF', emissiveIntensity: 1 }));
    luz.position.y = 0.32;
    antena.add(haste, luz);
    naSuperficie(p, antena, 82, 0);
  },
  pista(p) {
    // pista de corrida em volta do equador, com cones e bandeirinhas
    const pista = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.05, 6, 64), fosco('#C8644E'));
    pista.rotation.x = Math.PI / 2;
    p.add(pista);
    const faixa = new THREE.Mesh(new THREE.TorusGeometry(R + 0.055, 0.008, 4, 64), fosco('#FFFFFF'));
    faixa.rotation.x = Math.PI / 2;
    p.add(faixa);
    for (let i = 0; i < 8; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 10), brilho('#F28C28'));
      cone.geometry.translate(0, 0.05, 0);
      naSuperficie(p, cone, 18 + (i % 2) * 20, i * 45);
    }
    const cores = ['#E3205D', '#3E93D0', '#F6BB33', '#A0C630'];
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 3), brilho(cores[i % 4]));
      f.geometry.translate(0, 0.06, 0);
      naSuperficie(p, f, -30 - (i % 2) * 15, i * 60 + 20);
    }
  },
  trofeus(p) {
    const ouro = brilho('#F6BB33', { metalness: 0.5, emissive: '#F6BB33', emissiveIntensity: 0.15 });
    const taca = new THREE.Group();
    const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.06, 12), ouro);
    pe.position.y = 0.03;
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), ouro);
    haste.position.y = 0.11;
    const copo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.04, 0.16, 16), ouro);
    copo.position.y = 0.24;
    taca.add(pe, haste, copo);
    naSuperficie(p, taca, 90, 0);
    for (let i = 0; i < 8; i++) {
      const sh = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.025 : 0.06, a = Math.PI / 2 + k * Math.PI / 5; sh[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
      const e = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }), ouro);
      e.geometry.translate(0, 0.07, 0);
      naSuperficie(p, e, -35 + (i * 23) % 80, i * 45 + 10);
    }
    for (let i = 0; i < 5; i++) {
      const podio = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.05 + (i % 3) * 0.04, 0.08, 2, 0.01), fosco(['#9C7FD0', '#C8644E', '#B89A4A'][i % 3]));
      podio.geometry.translate(0, 0.04, 0);
      naSuperficie(p, podio, 20 - (i * 17) % 60, i * 72 + 40);
    }
  },
};

// Um mundo por vez, grande no meio. Trocar de mundo é uma viagem: o mundo atual sai girando para o lado,
// riscos de velocidade cruzam a tela e o novo entra com um quique, uma onda de choque e uma chuva de peças.
// As setas dos lados pulsam e as bolinhas embaixo mostram que há 5 mundos para passar.
const DURACAO = 1.0;
const CORES_PECA = ['#3E93D0', '#E3205D', '#F6BB33', '#A0C630'];
const sai = k => k * k * k;                                         // acelera
const chega = k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2); // quique no fim (easeOutBack)

export class Planetas {
  // aoMudar(dir): clicaram/arrastaram para o mundo anterior (-1) ou o próximo (+1)
  constructor(caixa, aoMudar) {
    this.caixa = caixa;
    this.canvas = document.createElement('canvas');
    caixa.append(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.cena = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-5, 5, 1.5, -1.5, 0.1, 50);
    this.camera.position.set(0, 0.35, 10);
    this.camera.lookAt(0, 0, 0);
    this.cena.add(new THREE.HemisphereLight('#ffffff', '#b9a98a', 1.7));
    const sol = new THREE.DirectionalLight('#fff3dc', 2.2);
    sol.position.set(-3, 4, 6);
    this.cena.add(sol);

    // brilho redondo atrás do mundo, na cor do selo
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texturaHalo(), transparent: true, depthWrite: false, toneMapped: false }));
    this.halo.position.z = -3;
    this.cena.add(this.halo);

    this.mundos = ORDEM_MUNDOS.map((id, i) => {
      const def = MUNDOS[id];
      const raiz = new THREE.Group();
      const planeta = new THREE.Group();
      planeta.rotation.z = 0.2;
      planeta.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshStandardMaterial({ map: texturaTerra(def.planeta, i + 1), roughness: 0.7 })));
      DETALHES[def.planeta.detalhe](planeta);
      const anel = new THREE.Mesh(new THREE.TorusGeometry(R * 1.32, 0.03, 8, 64), brilho(def.cor, { emissive: def.cor, emissiveIntensity: 0.4 }));
      anel.rotation.x = Math.PI / 2.3;
      // estrelinhas em órbita
      const orbita = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const e = new THREE.Mesh(geoEstrela(0.07), brilho(k % 2 ? '#FFFFFF' : def.cor, { emissive: def.cor, emissiveIntensity: 0.3 }));
        const a = k * Math.PI / 3;
        e.position.set(Math.cos(a) * R * 1.55, Math.sin(a * 2) * 0.25, Math.sin(a) * R * 1.55);
        orbita.add(e);
      }
      orbita.rotation.x = 0.35;
      // trancado: casca acinzentada por cima e um cadeado na frente
      const casca = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 40, 24), new THREE.MeshBasicMaterial({ color: '#E4E7EE', transparent: true, opacity: 0.72, depthWrite: false }));
      const cadeado = new THREE.Group();
      const corpo = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.5, 0.22, 3, 0.07), brilho('#F6BB33', { metalness: 0.3 }));
      const alca = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 10, 24, Math.PI), brilho('#9AA3B5', { metalness: 0.5 }));
      alca.position.y = 0.25;
      const furo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12), fosco('#1E2A4A'));
      furo.rotation.x = Math.PI / 2; furo.position.set(0, 0.03, 0.02);
      cadeado.add(corpo, alca, furo);
      cadeado.position.set(0, -0.05, R * 1.25);
      const tranca = new THREE.Group();
      tranca.add(casca, cadeado);
      tranca.visible = false;
      raiz.add(planeta, anel, orbita, tranca);
      raiz.visible = false;
      this.cena.add(raiz);
      return { id, def, raiz, planeta, anel, orbita, tranca, cadeado, trancado: false };
    });

    // onda de choque, riscos de velocidade e chuva de peças da chegada
    this.onda = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.onda.position.z = -1;
    this.cena.add(this.onda);
    this.riscos = Array.from({ length: 14 }, () => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.035), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      m.position.z = -2;
      this.cena.add(m);
      return m;
    });
    this.pecas = [];

    // controles em HTML: setas dos lados, cartão do nome, bolinhas
    caixa.insertAdjacentHTML('beforeend', `
      <button class="seta-mundo esq" title="Mundo anterior (↑)"><svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8"/></svg><span>Mundo<br>anterior</span></button>
      <button class="seta-mundo dir" title="Próximo mundo (↓)"><span>Próximo<br>mundo</span><svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8"/></svg></button>
      <div class="cartao-mundo"></div>
      <div class="pontos-mundo"></div>`);
    this.$ = sel => caixa.querySelector(sel);
    this.$('.seta-mundo.esq').onclick = () => aoMudar(-1);
    this.$('.seta-mundo.dir').onclick = () => aoMudar(1);
    // arrastar o dedo/mouse para o lado também troca
    let x0 = null;
    this.canvas.onpointerdown = ev => { x0 = ev.clientX; };
    this.canvas.onpointerup = ev => { if (x0 !== null && Math.abs(ev.clientX - x0) > 50) aoMudar(ev.clientX < x0 ? 1 : -1); x0 = null; };
    this.aoMudar = aoMudar;

    this.atual = null;
    this.anim = null;
    this.ligado = false;
    this.antes = performance.now();
    this.relogio = 0;
    addEventListener('resize', () => this.redimensionar());
  }

  // idVisto: mundo mostrado; info[id] = { trancado, feitas, total }
  atualizar(idVisto, info) {
    const i = ORDEM_MUNDOS.indexOf(idVisto);
    this.mundos.forEach(m => {
      m.trancado = !!info[m.id]?.trancado;
      m.tranca.visible = m.trancado;
    });
    const m = this.mundos[i], inf = info[idVisto] || {};
    const html = `<img src="${m.def.selo}" alt=""><div><b>Mundo ${m.def.n} de ${ORDEM_MUNDOS.length}</b><strong>${m.def.nome}</strong>
      <i>${m.trancado ? '🔒 Vençam o mundo anterior para liberar' : `${inf.feitas ?? 0} de ${inf.total ?? 11} fases feitas`}</i></div>`;
    const cartao = this.$('.cartao-mundo');
    if (this.atual !== i) {
      const dir = this.atual === null ? 0 : Math.sign(i - this.atual) * (Math.abs(i - this.atual) > 2 ? -1 : 1); // volta da ponta = continua no mesmo sentido
      if (this.atual !== null) this.anim = { de: this.atual, para: i, dir: dir || 1, t: 0, explodiu: false };
      else this.mundos[i].raiz.visible = true;
      this.atual = i;
      cartao.style.setProperty('--de', `${(dir || 0) * 40}vh`);
      cartao.classList.remove('entra'); void cartao.offsetWidth; cartao.classList.add('entra');
    }
    cartao.innerHTML = html;
    cartao.style.setProperty('--cor', m.def.cor);
    cartao.classList.toggle('trancado', m.trancado);
    this.caixa.style.setProperty('--cor', m.def.cor);
    this.$('.pontos-mundo').innerHTML = this.mundos.map((o, k) =>
      `<i class="${k === i ? 'sel' : ''} ${o.trancado ? 'trancado' : ''}" style="--c:${o.def.cor}"></i>`).join('');
  }

  ligar(sim) {
    if (sim === this.ligado) return;
    this.ligado = sim;
    if (sim) { this.redimensionar(); this.antes = performance.now(); requestAnimationFrame(t => this.quadro(t)); }
  }

  redimensionar() {
    const w = this.caixa.clientWidth, h = this.caixa.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const alt = 10 * h / w;
    Object.assign(this.camera, { left: -5, right: 5, top: alt * 0.5, bottom: -alt * 0.5 });
    this.camera.updateProjectionMatrix();
    this.alt = alt;
    this.tam = Math.min(1.25, alt * 0.3 / R);    // o mundo ocupa ~60% da altura
    this.meio = alt * 0.07;                      // um pouco acima do centro (o cartão fica embaixo)
  }

  explodir(cor) {
    this.onda.material.color.set(cor);
    this.onda.userData.t = 0;
    for (let k = 0; k < 36; k++) {
      const geo = k % 3 ? new RoundedBoxGeometry(0.12, 0.08, 0.12, 1, 0.02) : geoEstrela(0.08);
      const p = new THREE.Mesh(geo, brilho(k % 3 ? CORES_PECA[k % 4] : cor));
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 3;
      p.userData = { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 + 1, vida: 0.9 + Math.random() * 0.5, giro: (Math.random() - 0.5) * 12 };
      p.position.set(0, this.meio || 0, 1.5);
      this.cena.add(p);
      this.pecas.push(p);
    }
  }

  quadro(agora) {
    if (!this.ligado) return;
    const dt = Math.min(0.05, (agora - this.antes) / 1000);
    this.antes = agora;
    this.relogio += dt;
    if (this.canvas.width !== Math.round(this.caixa.clientWidth * this.renderer.getPixelRatio())) this.redimensionar();
    const t = this.relogio, S = this.tam || 1;

    // mundo parado no meio: flutua e gira devagar
    const atual = this.mundos[this.atual];
    for (const m of this.mundos) {
      if (!m.raiz.visible) continue;
      m.planeta.rotation.y += dt * (m.trancado ? 0.12 : 0.45);
      m.orbita.rotation.y += dt * 0.8;
      m.anel.rotation.z = t * 0.6;
      m.orbita.visible = m.anel.visible = !m.trancado;
      if (m.trancado) { m.cadeado.rotation.z = Math.sin(t * 2.4) * 0.12; m.cadeado.position.y = -0.05 + Math.sin(t * 1.7) * 0.04; }
      m.planeta.traverse(o => { if (o.userData.gira) o.userData.gira.rotation.z = t * 1.5; });
    }
    let zoom = 1;
    if (this.anim) {
      const a = this.anim;
      a.t += dt / DURACAO;
      const k = Math.min(1, a.t);
      const velho = this.mundos[a.de], novo = this.mundos[a.para];
      // o velho sai (0 → 0.45), o novo entra (0.3 → 1)
      const ks = Math.min(1, k / 0.45);
      velho.raiz.visible = ks < 1;
      velho.raiz.position.set(-a.dir * 7 * sai(ks), (this.meio || 0) + Math.sin(ks * Math.PI) * 0.4, 0);
      velho.raiz.scale.setScalar(S * (1 - 0.6 * ks));
      velho.planeta.rotation.y -= dt * 14 * a.dir;
      const ke = Math.max(0, (k - 0.3) / 0.7);
      novo.raiz.visible = k > 0.3;
      novo.raiz.position.set(a.dir * 7 * (1 - chega(ke)), (this.meio || 0) + Math.sin(ke * Math.PI) * -0.3, 0);
      novo.raiz.scale.setScalar(S * (0.35 + 0.65 * Math.min(1.2, chega(ke))));
      novo.planeta.rotation.y += dt * 10 * (1 - ke) * a.dir;
      // riscos de velocidade no meio da viagem
      const forca = Math.sin(Math.min(1, k / 0.8) * Math.PI);
      this.riscos.forEach((r, n) => {
        r.material.color.set(n % 3 ? novo.def.cor : '#1E2A4A');
        r.material.opacity = forca * (0.3 + (n % 3) * 0.2);
        r.scale.x = 1.5 + (n % 4);
        r.position.set(((n * 2.7 + t * 30 * -a.dir) % 14 + 14) % 14 - 7, ((n * 0.37) % 1 - 0.5) * 2.2, -2);
      });
      zoom = 1 + forca * 0.06;
      if (ke > 0.55 && !a.explodiu) { a.explodiu = true; if (!novo.trancado) this.explodir(novo.def.cor); }
      if (k >= 1) { velho.raiz.visible = false; velho.raiz.position.set(0, 0, 0); this.riscos.forEach(r => { r.material.opacity = 0; }); this.anim = null; }
    } else if (atual) {
      atual.raiz.visible = true;
      atual.raiz.position.set(0, (this.meio || 0) + Math.sin(t * 1.8) * 0.06, 0);
      atual.raiz.scale.setScalar(S);
    }
    // halo na cor do mundo (troca suave)
    if (atual) this.halo.material.color.lerp(new THREE.Color(atual.trancado ? '#C9CED8' : atual.def.cor), Math.min(1, dt * 4));
    this.halo.scale.setScalar((this.alt || 2) * (0.96 + Math.sin(t * 2) * 0.03));
    this.halo.position.y = this.meio || 0;
    // onda de choque
    const o = this.onda.userData;
    if (o.t !== undefined && o.t < 1) {
      o.t += dt * 1.6;
      this.onda.scale.setScalar(S * (0.8 + o.t * 1.6));
      this.onda.position.y = this.meio || 0;
      this.onda.material.opacity = (1 - o.t) * 0.8;
    } else this.onda.material.opacity = 0;
    // chuva de peças
    this.pecas = this.pecas.filter(p => {
      const u = p.userData;
      u.vida -= dt;
      if (u.vida <= 0) { this.cena.remove(p); p.geometry.dispose(); p.material.dispose(); return false; }
      u.vy -= 6 * dt;
      p.position.x += u.vx * dt; p.position.y += u.vy * dt;
      p.rotation.z += u.giro * dt; p.rotation.x += u.giro * 0.5 * dt;
      p.scale.setScalar(Math.min(1, u.vida * 2));
      return true;
    });
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.cena, this.camera);
    requestAnimationFrame(tt => this.quadro(tt));
  }
}

function geoEstrela(r) {
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, a = Math.PI / 2 + k * Math.PI / 5; sh[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  return new THREE.ExtrudeGeometry(sh, { depth: r * 0.3, bevelEnabled: false });
}

function texturaHalo() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
