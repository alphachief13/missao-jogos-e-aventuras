// Escolha de mundo: cinco mundinhos redondos lado a lado, girando devagar, cada um com a sua cara
// (árvores, blocos de montar, engrenagens, pista de gincana, troféus). O escolhido fica maior e com um anel.
// Os nomes e cadeados ficam em HTML por cima (rótulos), nas mesmas posições (10%, 30%, 50%, 70%, 90%).
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

export class Planetas {
  // aoEscolher(idMundo) quando clicam num mundo liberado
  constructor(caixa, aoEscolher) {
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

    this.mundos = ORDEM_MUNDOS.map((id, i) => {
      const def = MUNDOS[id];
      const raiz = new THREE.Group();
      raiz.position.x = -4 + i * 2;
      const planeta = new THREE.Group();
      planeta.rotation.z = 0.2;
      const globo = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshStandardMaterial({ map: texturaTerra(def.planeta, i + 1), roughness: 0.7 }));
      planeta.add(globo);
      DETALHES[def.planeta.detalhe](planeta);
      // anel na cor do selo (aparece no mundo escolhido)
      const anel = new THREE.Mesh(new THREE.TorusGeometry(R * 1.32, 0.035, 8, 64), brilho(def.cor, { emissive: def.cor, emissiveIntensity: 0.4 }));
      anel.rotation.x = Math.PI / 2.3;
      raiz.add(planeta, anel);
      this.cena.add(raiz);
      const materiais = [];
      raiz.traverse(o => { if (o.material) materiais.push({ m: o.material, cor: o.material.color.clone() }); });
      return { id, raiz, planeta, anel, materiais, escala: 0.7, trancado: false };
    });

    // rótulos em HTML: selo, nome e progresso
    this.rotulos = ORDEM_MUNDOS.map((id, i) => {
      const b = document.createElement('button');
      b.className = 'rotulo-mundo';
      b.style.left = `${10 + i * 20}%`;
      b.onclick = () => { if (!this.mundos[i].trancado) aoEscolher(id); };
      caixa.append(b);
      return b;
    });
    this.canvas.onclick = ev => {
      const r = this.canvas.getBoundingClientRect();
      const i = Math.max(0, Math.min(4, Math.floor((ev.clientX - r.left) / r.width * 5)));
      if (!this.mundos[i].trancado) aoEscolher(ORDEM_MUNDOS[i]);
    };
    this.canvas.onpointermove = ev => {
      const r = this.canvas.getBoundingClientRect();
      const i = Math.max(0, Math.min(4, Math.floor((ev.clientX - r.left) / r.width * 5)));
      this.canvas.style.cursor = this.mundos[i].trancado ? 'not-allowed' : 'pointer';
      this.sobre = i;
    };
    this.canvas.onpointerleave = () => { this.sobre = -1; };
    this.sobre = -1;
    this.ligado = false;
    this.antes = performance.now();
    addEventListener('resize', () => this.redimensionar());
  }

  // escolhido: id do mundo; info[id] = { trancado, feitas, total }
  atualizar(escolhido, info) {
    this.escolhido = escolhido;
    this.mundos.forEach((m, i) => {
      const inf = info[m.id] || {};
      m.trancado = !!inf.trancado;
      for (const { m: mat, cor } of m.materiais) mat.color.copy(cor).lerp(new THREE.Color('#C9CED8'), m.trancado ? 0.75 : 0);
      const def = MUNDOS[m.id];
      this.rotulos[i].className = `rotulo-mundo ${m.id === escolhido ? 'sel' : ''} ${m.trancado ? 'trancado' : ''}`;
      this.rotulos[i].style.setProperty('--cor', def.cor);
      this.rotulos[i].innerHTML = `<img src="${def.selo}" alt=""><span><b>Mundo ${def.n}</b>${def.nome}</span>` +
        `<i>${m.trancado ? '🔒 trancado' : `${inf.feitas ?? 0} de ${inf.total ?? 11}`}</i>`;
    });
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
    // os rótulos ocupam o pé da caixa: o centro dos mundinhos fica um pouco acima do meio
    const alt = 10 * h / w;
    Object.assign(this.camera, { left: -5, right: 5, top: alt * 0.42, bottom: -alt * 0.58 });
    this.camera.updateProjectionMatrix();
  }

  quadro(agora) {
    if (!this.ligado) return;
    const dt = Math.min(0.05, (agora - this.antes) / 1000);
    this.antes = agora;
    if (this.canvas.width !== Math.round(this.caixa.clientWidth * this.renderer.getPixelRatio())) this.redimensionar();
    const t = agora / 1000;
    this.mundos.forEach((m, i) => {
      const sel = m.id === this.escolhido;
      const alvo = sel ? 0.98 : this.sobre === i && !m.trancado ? 0.82 : 0.7;
      m.escala += (alvo - m.escala) * Math.min(1, dt * 8);
      m.raiz.scale.setScalar(m.escala);
      m.raiz.position.y = sel ? Math.sin(t * 2) * 0.05 : 0;
      m.planeta.rotation.y += dt * (sel ? 0.5 : 0.18) * (m.trancado ? 0.3 : 1);
      m.anel.visible = sel;
      m.anel.rotation.z = t * 0.6;
      m.planeta.traverse(o => { if (o.userData.gira) o.userData.gira.rotation.z = t * 1.5; });
    });
    this.renderer.render(this.cena, this.camera);
    requestAnimationFrame(tt => this.quadro(tt));
  }
}
