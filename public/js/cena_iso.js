// Cena isométrica (Mundo 2): mapa de blocos visto de cima na diagonal, personagens em sprites de pé.
// Mundo da simulação: x = leste, z = sul, y = altura. Three: X = x, Y = y, Z = z (sem conversão).
// A câmera olha do sudeste, então "direita na tela" é +x −z e "baixo na tela" é +x +z (igual ao sim_iso).
// Cada aparelho desenha a própria câmera: seguir([id]) acompanha um personagem, seguir([a, b]) divide a tela,
// seguir([]) é a plateia (mapa inteiro).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CORES, PERS_COR, COR_PERS, ICONE, bussola } from './comum.js';

const CHAO = { grama: '#CFE3A8', grama2: '#C4DB9B', terra: '#B38A60', topo: '#F3E7CC', lado: '#E0CBA5',
               muro: '#FFFFFF', muro2: '#EFE8D8', madeira: '#C98B4E', madeira2: '#E2AE74', agua: '#6EC1EA', fundo: '#9CCBDD' };
const COR_DO_CHAO = { b: 'azul', r: 'rosa', y: 'amarelo', g: 'verde' };
const FX = { INVUL: 1, PLANANDO: 4, TEM_MOLA: 8, TEM_PLANADOR: 16, CAIDO_SEM_CORACAO: 32 };
const CORES_PECA = ['#3E93D0', '#E3205D', '#F6BB33', '#A0C630'];
const SPRITE_ALT = 2.13, PES = 376 / 384, ESTICA = 1.12;
const ALTURA_MURO = 1.8;
const DIR_CAM = new THREE.Vector3(1, 1.2, 1).normalize();
// Folhas de sprite: isométricas (do Codex) quando existirem; senão as de plataforma (de lado, espelhadas).
const ANIM_ISO = {
  idle: ['_idle', 2], corrida: ['_corrida', 4], pulo: ['_pulo', 1], queda: ['_queda', 1], carregar: ['_carregar', 4],
  carregar_parado: ['_carregar', 4], empurrar: ['_empurrar', 2], ajudar: ['ajudar', 2], caido: ['caido', 1],
};
const ANIM_LADO = {
  idle: ['idle', 2], corrida: ['corrida', 4], pulo: ['pulo', 1], queda: ['queda', 1], carregar: ['corrida', 4],
  carregar_parado: ['idle', 2], empurrar: ['empurrar', 1], ajudar: ['aceno', 1], caido: ['derrota', 1], vitoria: ['vitoria', 1],
};
const FPS = { corrida: 10, carregar: 7, empurrar: 4, ajudar: 6 };

const carregador = new THREE.TextureLoader();
const cacheTex = new Map();
function tex(url) {
  if (!cacheTex.has(url)) {
    const t = carregador.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cacheTex.set(url, t);
  }
  return cacheTex.get(url);
}
// Carrega uma imagem opcional: chama ok(textura) só se ela existir.
function talvez(url, ok) {
  carregador.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; ok(t); }, undefined, () => {});
}
const retrato = cor => tex(`assets/personagens/${COR_PERS[cor]}/retrato.png`);

function fosco(cor, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.65, clearcoat: 0.25, clearcoatRoughness: 0.5, ...extra });
}
function plastico(cor, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, ...extra });
}
function icone(map, tam, x, y, z) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, toneMapped: false, depthTest: false }));
  s.scale.set(tam, tam, 1);
  s.position.set(x, y, z);
  s.renderOrder = 30;
  return s;
}
function sombrear(obj, emite = true) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = emite; o.receiveShadow = true; } });
  return obj;
}
function instanciado(geo, mat, itens, sombra = true) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, itens.length));
  m.count = itens.length;
  const o = new THREE.Object3D();
  itens.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z);
    o.scale.set(1, it.sy ?? 1, 1);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    m.setColorAt(i, new THREE.Color(it.cor));
  });
  m.castShadow = sombra; m.receiveShadow = true;
  return m;
}
// Textura de um ícone SVG (data URL) desenhado num canvas.
function texIcone(svg, fundo = null) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const g = c.getContext('2d');
    if (fundo) { g.fillStyle = fundo; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill(); }
    g.drawImage(img, fundo ? 22 : 0, fundo ? 22 : 0, fundo ? 84 : 128, fundo ? 84 : 128);
    t.needsUpdate = true;
  };
  img.src = svg;
  return t;
}
// Número grande da missão numa placa redonda.
function texNumero(n, cor) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const desenhar = () => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = cor; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.font = '700 76px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(n, 64, 70);
    t.needsUpdate = true;
  };
  desenhar();
  document.fonts?.ready.then(desenhar);
  return t;
}
function texturaRadial(cor) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, cor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function texturaAnel() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 30, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class CenaIso {
  constructor(canvas, { celular = false } = {}) {
    this.canvas = canvas;
    this.celular = celular;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !celular });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, celular ? 1.5 : 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setScissorTest(true);
    this.cena = new THREE.Scene();
    this.cena.background = new THREE.Color('#DCEFD0');
    this.cena.add(new THREE.HemisphereLight('#f4fbff', '#b9c99a', 1.6));
    this.sol = new THREE.DirectionalLight('#fff3dc', 2.2);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048);
    this.sol.shadow.bias = -0.0008;
    this.sol.shadow.normalBias = 0.03;
    this.cena.add(this.sol, this.sol.target);

    this.vistas = [];
    this.seguindo = [];
    this.fase = null;
    this.grupo = null;
    this.particulas = [];
    this.relogio = 0;
    this.estado = null;
    addEventListener('resize', () => this.redimensionar());
  }

  // Quem esta tela acompanha: [] plateia, [id] um personagem, [a, b] tela dividida
  // (juntos: os dois estão perto, uma câmera só no meio deles). ativo: quem recebe a seta-guia.
  seguir(ids, { juntos = false, ativo = null } = {}) {
    const lista = (ids || []).slice(0, 2);
    this.ativo = ativo ?? (lista.length === 1 ? lista[0] : null);
    const chave = lista.join(juntos ? '+' : ',');
    if (chave === this.seguindo && this.vistas.length) return;
    const antes = this.vistas;
    this.seguindo = chave;
    const grupos = juntos || lista.length < 2 ? [lista] : lista.map(id => [id]);
    this.vistas = grupos.map((ids, i) => ({
      ids, id: ids.length === 1 ? ids[0] : null,
      cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200),
      alvo: antes[i]?.alvo?.clone() ?? null, // a câmera desliza ao juntar/separar, sem pulo
    }));
    this.redimensionar();
  }

  // ---------- montagem ----------
  carregarFase(fase) {
    if (this.grupo) this.cena.remove(this.grupo);
    this.fase = fase;
    this.grupo = new THREE.Group();
    this.cena.add(this.grupo);
    this.particulas = [];
    this.L = fase.mapa.length;
    this.C = fase.mapa[0].length;
    this.estado = null;
    this.timesEmJogo = new Set(fase.personagens.map(p => PERS_COR[p.id]));
    this.coresGatilho = {};
    for (const a of fase.alavancas || []) this.coresGatilho[a.id] = a.cor;
    for (const b of fase.botoes || []) this.coresGatilho[b.id] = b.cor;

    // sol cobrindo o mapa inteiro
    const meio = new THREE.Vector3(this.C / 2, 0, this.L / 2);
    this.sol.position.copy(meio).add(new THREE.Vector3(-12, 30, 10));
    this.sol.target.position.copy(meio);
    const r = Math.max(this.C, this.L) * 0.75;
    Object.assign(this.sol.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 90 });
    this.sol.shadow.camera.updateProjectionMatrix();

    this.montarTerreno(fase.mapa);
    this.montarChaoColorido(fase.mapa);
    this.montarAgua(fase.mapa);
    this.montarArredores();
    this.montarEnfeites(fase.enfeites || []);
    this.montarGemas(fase.gemas);
    this.montarAlavancas(fase.alavancas || []);
    this.montarPlacas(fase.botoes || []);
    this.montarPlataformas(fase.plataformas || []);
    this.montarObras(fase.obras || []);
    this.montarCaixas(fase.caixas || []);
    this.montarBlocos(fase.blocos || []);
    this.montarEncaixes(fase.encaixes || []);
    this.montarMissoes(fase.missoes || []);
    this.montarPersonagens(fase.personagens);
    this.montarGuias();
    if (!this.vistas.length) this.seguir([]);
    for (const v of this.vistas) v.alvo = null;
    this.redimensionar();
  }

  alturaTerreno(c, l) {
    const t = this.fase.mapa[l]?.[c];
    if (t === undefined) return 0;
    if (t === '~') return -0.9;
    return /[0-3]/.test(t) ? Number(t) : 0;
  }

  montarTerreno(mapa) {
    const colunas = [], tampas = [], pinos = [], muros = [], arvores = [];
    for (let l = 0; l < this.L; l++) for (let c = 0; c < this.C; c++) {
      const t = mapa[l][c];
      const h = this.alturaTerreno(c, l);
      const alto = h > 0;
      const xadrez = (c + l) % 2;
      const base = -1.4;
      colunas.push({ x: c + 0.5, y: (h + base) / 2 - 0.1, z: l + 0.5, sy: h - base - 0.2,
                     cor: t === '~' ? CHAO.fundo : alto ? CHAO.lado : CHAO.terra });
      if (t !== '~' && !(t in COR_DO_CHAO)) {
        tampas.push({ x: c + 0.5, y: h - 0.1, z: l + 0.5,
                      cor: alto ? (xadrez ? CHAO.topo : '#EEDFC0') : (xadrez ? CHAO.grama : CHAO.grama2) });
        if (alto) for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25])
          pinos.push({ x: c + 0.5 + dx, y: h + 0.05, z: l + 0.5 + dz, cor: CHAO.topo });
      }
      if (t === '#') {
        const borda = c === 0 || l === 0 || c === this.C - 1 || l === this.L - 1;
        muros.push({ x: c + 0.5, y: ALTURA_MURO / 2, z: l + 0.5, cor: borda ? CHAO.muro2 : (xadrez ? CHAO.muro : CHAO.muro2) });
        for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25])
          pinos.push({ x: c + 0.5 + dx, y: ALTURA_MURO + 0.05, z: l + 0.5 + dz, cor: borda ? CHAO.muro2 : CHAO.muro });
      }
      if (t === 'T') arvores.push([c + 0.5, l + 0.5]);
    }
    this.grupo.add(instanciado(new THREE.BoxGeometry(1, 1, 1), fosco('#fff'), colunas, false));
    this.grupo.add(instanciado(new RoundedBoxGeometry(1, 0.2, 1, 2, 0.04), fosco('#fff'), tampas, false));
    this.grupo.add(instanciado(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), fosco('#fff'), pinos));
    this.grupo.add(instanciado(new RoundedBoxGeometry(0.98, ALTURA_MURO, 0.98, 2, 0.08), fosco('#fff'), muros));
    for (const [x, z] of arvores) this.enfeite('arvore', x, z, true);
  }

  // Chão colorido: só o time da cor passa. Cortina translúcida na cor + retrato do time nas pontas.
  montarChaoColorido(mapa) {
    const vistos = new Set();
    for (let l = 0; l < this.L; l++) for (let c = 0; c < this.C; c++) {
      const t = mapa[l][c];
      if (!(t in COR_DO_CHAO) || vistos.has(`${c},${l}`)) continue;
      // faixa vertical (corredor) ou horizontal
      let w = 1, d = 1;
      while (mapa[l + d]?.[c] === t) d++;
      if (d === 1) while (mapa[l]?.[c + w] === t) w++;
      for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) vistos.add(`${c + i},${l + k}`);
      const cor = CORES[COR_DO_CHAO[t]];
      const piso = new THREE.Mesh(new RoundedBoxGeometry(w - 0.04, 0.22, d - 0.04, 2, 0.06),
        plastico(cor, { emissive: cor, emissiveIntensity: 0.18 }));
      piso.position.set(c + w / 2, -0.1, l + d / 2);
      piso.receiveShadow = true;
      const cortina = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 1.2, d - 0.1),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.2, depthWrite: false }));
      cortina.position.set(c + w / 2, 0.6, l + d / 2);
      this.grupo.add(piso, cortina);
      const r = retrato(COR_DO_CHAO[t]);
      this.grupo.add(icone(r, 0.7, c + 0.5, 1.6, l + d - 0.5), icone(r, 0.7, c + w - 0.5, 1.6, l + 0.5));
    }
  }

  montarAgua(mapa) {
    this.agua = [];
    const mat = new THREE.MeshPhysicalMaterial({ color: CHAO.agua, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.82,
                                                 emissive: '#2a8fc4', emissiveIntensity: 0.12 });
    for (let l = 0; l < this.L; l++) for (let c = 0; c < this.C; c++) {
      if (mapa[l][c] !== '~') continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.001, 0.1, 1.001), mat);
      m.position.set(c + 0.5, -0.35, l + 0.5);
      m.receiveShadow = true;
      this.grupo.add(m);
      this.agua.push({ m, fase: (c + l) * 0.6 });
    }
  }

  // Gramado em volta do mapa e algumas árvores fora da cerca, para não ter "vazio" na borda.
  montarArredores() {
    // moldura de gramado (4 faixas) para não cobrir a água dentro do mapa
    const M = 40, mat = fosco(CHAO.grama2);
    for (const [x, z, w, d] of [[this.C / 2, -M / 2, this.C + 2 * M, M], [this.C / 2, this.L + M / 2, this.C + 2 * M, M],
                                [-M / 2, this.L / 2, M, this.L], [this.C + M / 2, this.L / 2, M, this.L]]) {
      const plano = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      plano.rotation.x = -Math.PI / 2;
      plano.position.set(x, -0.21, z);
      plano.receiveShadow = true;
      this.grupo.add(plano);
    }
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rx = this.C / 2 + 2.5 + (i % 3), rz = this.L / 2 + 2.5 + (i % 2) * 1.5;
      this.enfeite('arvore', this.C / 2 + Math.cos(a) * rx, this.L / 2 + Math.sin(a) * rz, false);
    }
  }

  montarEnfeites(lista) { for (const e of lista) this.enfeite(e.tipo, e.x, e.z, true); }

  // Enfeite: sprite do Codex quando existir; até lá, uma forma simples em 3D.
  enfeite(tipo, x, z, noMapa) {
    const y = noMapa ? this.alturaTerreno(Math.floor(x), Math.floor(z)) : 0;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const forma = FORMAS[tipo]?.() || FORMAS.pedra();
    g.add(forma);
    sombrear(g);
    this.grupo.add(g);
    const tam = TAMANHO_ENFEITE[tipo];
    if (tam) talvez(`assets/mundo2/enfeites/${tipo === 'arvore' ? `arvore_${1 + (Math.floor(x * 7 + z * 3) % 2)}` : tipo}.png`, t => {
      g.remove(forma);
      const [w, h] = tam;
      const geo = new THREE.PlaneGeometry(w, h);
      geo.translate(0, h / 2, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.4, toneMapped: false }));
      m.rotation.y = Math.PI / 4;
      g.add(m);
      const sombra = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, w * 0.5),
        new THREE.MeshBasicMaterial({ map: texturaRadial('rgba(15,20,45,0.4)'), transparent: true, depthWrite: false }));
      sombra.rotation.x = -Math.PI / 2;
      sombra.position.y = 0.02;
      g.add(sombra);
    });
  }

  montarGemas(gemas) {
    const geoPeca = new RoundedBoxGeometry(0.46, 0.26, 0.3, 2, 0.05);
    const geoPino = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12);
    const geoMastro = new THREE.CylinderGeometry(0.035, 0.035, 0.9, 10);
    const geoPano = new THREE.BufferGeometry();
    geoPano.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.42, 0, 0, 0.06, 0, 0.5, 0.24, 0], 3));
    geoPano.computeVertexNormals();
    this.gemas = gemas.map((g, i) => {
      const grupo = new THREE.Group();
      if (g.cor === 'peca') {
        const mat = plastico(CORES_PECA[i % 4]);
        grupo.add(new THREE.Mesh(geoPeca, mat));
        for (const dx of [-0.11, 0.11]) { const p = new THREE.Mesh(geoPino, mat); p.position.set(dx, 0.17, 0); grupo.add(p); }
      } else {
        const mastro = new THREE.Mesh(geoMastro, plastico('#8B5A2B'));
        mastro.position.y = -0.05;
        const pano = new THREE.Mesh(geoPano, plastico(CORES[g.cor], { side: THREE.DoubleSide, emissive: CORES[g.cor], emissiveIntensity: 0.15 }));
        pano.position.set(0.03, -0.05, 0);
        grupo.add(mastro, pano);
        grupo.userData.pano = pano;
        grupo.scale.setScalar(1.3);
      }
      const y = g.y ?? this.alturaTerreno(Math.floor(g.x), Math.floor(g.z)) + 0.7;
      grupo.position.set(g.x, y, g.z);
      sombrear(grupo);
      this.grupo.add(grupo);
      return { mesh: grupo, base: y, fase: i * 0.7, pega: false, cor: g.cor };
    });
  }

  montarAlavancas(alavancas) {
    this.alavancas = alavancas.map(a => {
      const cor = a.cor ? CORES[a.cor] : '#FFFFFF';
      const g = new THREE.Group();
      g.position.set(a.x, this.alturaTerreno(Math.floor(a.x), Math.floor(a.z)), a.z);
      g.rotation.y = Math.PI / 4;
      const base = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.28, 0.6, 2, 0.08), plastico(cor));
      base.position.y = 0.14;
      const piv = new THREE.Group();
      piv.position.y = 0.26;
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 12), plastico(CORES.marinho));
      haste.position.y = 0.37;
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), plastico(cor, { emissive: cor, emissiveIntensity: 0.15 }));
      bola.position.y = 0.76;
      piv.add(haste, bola);
      g.add(base, piv);
      sombrear(g);
      if (a.cor) g.add(icone(retrato(a.cor), 0.6, 0, 1.55, 0));
      this.grupo.add(g);
      return { piv, ang: 0.6 };
    });
  }

  montarPlacas(botoes) {
    this.placas = botoes.map(b => {
      const cor = b.cor ? CORES[b.cor] : '#FFFFFF';
      const g = new THREE.Group();
      g.position.set(b.x, this.alturaTerreno(Math.floor(b.x), Math.floor(b.z)), b.z);
      const moldura = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.08, 0.96, 2, 0.03), plastico(CORES.marinho));
      moldura.position.y = 0.04;
      const tampa = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.14, 0.76, 2, 0.05),
        plastico(cor, { emissive: b.cor ? cor : '#9fe3ff', emissiveIntensity: 0 }));
      tampa.position.y = 0.14;
      g.add(moldura, tampa);
      sombrear(g, false);
      if (b.cor) g.add(icone(retrato(b.cor), 0.5, 0, 0.9, 0));
      this.grupo.add(g);
      return { tampa };
    });
  }

  montarPlataformas(plats) {
    this.plataformas = plats.map(p => {
      const g = new THREE.Group();
      const lampadas = [];
      const cx = p.x + p.w / 2, cz = p.z + p.d / 2;
      if (p.tipo === 'portao') {
        // parede de blocos brancos com faixas marinho; desce para dentro do chão quando abre
        const alto = p.y0 ?? 3;
        for (let i = 0; i < alto; i++) {
          const b = new THREE.Mesh(new RoundedBoxGeometry(p.w - 0.04, 0.96, p.d - 0.04, 2, 0.08), plastico(i % 2 ? CHAO.topo : '#FFFFFF'));
          b.position.y = -0.5 - i;
          const faixa = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.02, 0.12, p.d - 0.02 + 0.02), plastico(CORES.marinho));
          faixa.position.y = b.position.y + 0.3;
          g.add(b, faixa);
        }
        (p.gatilhos || []).forEach((id, i, todos) => {
          const cor = this.coresGatilho[id] ? CORES[this.coresGatilho[id]] : /^m\d/.test(id) ? CORES.amarelo : '#9fe3ff';
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.05 }));
          l.position.set((i - (todos.length - 1) / 2) * 0.36, -0.45, p.d / 2 + 0.02);
          g.add(l);
          lampadas.push({ l, id });
        });
      } else if (p.tipo === 'elevador') {
        const tampo = new THREE.Mesh(new RoundedBoxGeometry(p.w - 0.06, 0.3, p.d - 0.06, 2, 0.08), plastico('#FFFFFF'));
        tampo.position.y = -0.15;
        const coluna = new THREE.Mesh(new THREE.BoxGeometry(p.w * 0.5, 4, p.d * 0.5), plastico(CORES.amarelo));
        coluna.position.y = -2.2;
        g.add(tampo, coluna);
        for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25]) {
          const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), plastico('#FFFFFF'));
          pino.position.set(dx, 0.05, dz);
          g.add(pino);
        }
        const faixa = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.04, 0.08, p.d - 0.04), plastico(CORES.amarelo));
        faixa.position.y = -0.27;
        g.add(faixa);
      } else if (p.tipo === 'ponte') {
        for (let i = 0; i < p.d; i++) for (let k = 0; k < p.w; k++) {
          const tabua = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.25, 0.9, 2, 0.06), plastico(i % 2 ? CHAO.madeira : CHAO.madeira2));
          tabua.position.set(-p.w / 2 + 0.5 + k, -0.12, -p.d / 2 + 0.5 + i);
          g.add(tabua);
        }
        g.visible = false;
      } else {
        // degrau de blocos: sobe de dentro do chão
        for (let k = 0; k < p.w; k++) {
          const b = new THREE.Mesh(new RoundedBoxGeometry(0.96, 3, p.d - 0.04, 2, 0.08), plastico(k % 2 ? CHAO.topo : '#FFFFFF'));
          b.position.set(-p.w / 2 + 0.5 + k, -1.5, 0);
          g.add(b);
          for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25]) {
            const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), plastico('#FFFFFF'));
            pino.position.set(-p.w / 2 + 0.5 + k + dx, 0.05, dz);
            g.add(pino);
          }
        }
      }
      g.position.set(cx, p.y0 ?? 0, cz);
      sombrear(g);
      this.grupo.add(g);
      return { g, tipo: p.tipo, lampadas, h: p.y0, aparecer: 0 };
    });
  }

  // Obra: contorno fantasma do que vai ser construído + barra de progresso + mãozinhas (quantos times precisa).
  montarObras(obras) {
    const mao = texIcone(ICONE.acao, CORES.marinho);
    this.obras = obras.map(o => {
      const g = new THREE.Group();
      g.position.set(o.x + o.w / 2, 0, o.z + o.d / 2);
      const fantasma = new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.3, o.d),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
      fantasma.position.y = 0;
      const contorno = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.w, 0.3, o.d)),
        new THREE.LineDashedMaterial({ color: CORES.marinho, dashSize: 0.2, gapSize: 0.12 }));
      contorno.computeLineDistances();
      g.add(fantasma, contorno);
      // barra
      const barra = new THREE.Group();
      barra.position.set(0, 2.2, 0);
      const fundo = new THREE.Sprite(new THREE.SpriteMaterial({ color: CORES.marinho, depthTest: false }));
      fundo.scale.set(1.9, 0.32, 1);
      fundo.renderOrder = 31;
      const cheio = new THREE.Sprite(new THREE.SpriteMaterial({ color: CORES.amarelo, depthTest: false }));
      cheio.center.set(0, 0.5);
      cheio.position.x = -0.88;
      cheio.scale.set(0.001, 0.2, 1);
      cheio.renderOrder = 32;
      barra.add(fundo, cheio);
      g.add(barra);
      // mãozinhas
      const maos = [];
      const n = o.times === 'todos' ? this.timesEmJogo.size : Math.min(o.times ?? 2, this.timesEmJogo.size);
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mao, depthTest: false, transparent: true, opacity: 0.45 }));
        s.scale.set(0.55, 0.55, 1);
        s.position.set((i - (n - 1) / 2) * 0.62, 2.75, 0);
        s.renderOrder = 33;
        g.add(s);
        maos.push(s);
      }
      this.grupo.add(g);
      return { g, fantasma, contorno, barra, cheio, maos };
    });
  }

  // Seta grande que mostra o próximo lugar da missão (uma por personagem seguido, na cor do time).
  montarGuias() {
    this.guias = [0, 1].map(() => {
      const g = new THREE.Group();
      const seta = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 4), plastico('#fff', { emissive: '#fff', emissiveIntensity: 0.25 }));
      seta.rotation.x = Math.PI;
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 12), seta.material);
      haste.position.y = 0.75;
      const anel = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 36),
        new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.9, depthWrite: false }));
      anel.rotation.x = -Math.PI / 2;
      g.add(seta, haste);
      g.visible = anel.visible = false;
      this.grupo.add(g, anel);
      return { g, anel, mat: seta.material };
    });
  }

  // Setinhas no chão mostrando para onde a caixa anda (do lugar dela até a placa).
  trilhoDaCaixa(c) {
    const DIRS = { norte: [0, -1], sul: [0, 1], leste: [1, 0], oeste: [-1, 0] };
    const d = DIRS[c.direcoes?.[0]];
    if (!d) return;
    const tex = texIcone('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 70 L50 30 L80 70" fill="none" stroke="#F6BB33" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
    const placas = (this.fase.botoes || []).map(b => `${Math.floor(b.x)},${Math.floor(b.z)}`);
    let col = Math.floor(c.x), lin = Math.floor(c.z);
    for (let n = 0; n < 6; n++) {
      col += d[0]; lin += d[1];
      if (this.fase.mapa[lin]?.[col] !== '0') break;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      m.rotation.set(-Math.PI / 2, 0, Math.atan2(-d[0], -d[1]));
      m.position.set(col + 0.5, 0.03, lin + 0.5);
      this.grupo.add(m);
      if (placas.includes(`${col},${lin}`)) break;
    }
  }

  montarCaixas(caixas) {
    for (const c of caixas) this.trilhoDaCaixa(c);
    const mao = texIcone(ICONE.acao, CORES.marinho);
    this.caixas = caixas.map(c => {
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.94, 0.94, 2, 0.06), plastico(CHAO.madeira));
      corpo.position.y = 0.47;
      g.add(corpo);
      // ripas em X nas faces
      for (const [rx, ry, px, pz] of [[0, 0, 0, 0.48], [0, Math.PI / 2, 0.48, 0], [0, 0, 0, -0.48], [0, Math.PI / 2, -0.48, 0]]) {
        for (const giro of [0.78, -0.78]) {
          const ripa = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.04), plastico(CHAO.madeira2));
          ripa.position.set(px, 0.47, pz);
          ripa.rotation.set(rx, ry, giro);
          g.add(ripa);
        }
      }
      const maos = [];
      const n = Math.max(1, c.peso ?? 1);
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mao, depthTest: false, transparent: true, opacity: 0.45 }));
        s.scale.set(0.5, 0.5, 1);
        s.position.set((i - (n - 1) / 2) * 0.56, 1.5, 0);
        s.renderOrder = 33;
        g.add(s);
        maos.push(s);
      }
      sombrear(g);
      g.position.set(c.x, 0, c.z);
      this.grupo.add(g);
      return { g, maos };
    });
  }

  montarBlocos(blocos) {
    this.blocos = blocos.map(b => {
      const cor = b.cor ? CORES[b.cor] : '#FFFFFF';
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.42, 0.62, 2, 0.06), plastico(cor));
      corpo.position.y = 0.21;
      g.add(corpo);
      for (const dx of [-0.15, 0.15]) for (const dz of [-0.15, 0.15]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 14), plastico(cor));
        p.position.set(dx, 0.47, dz);
        g.add(p);
      }
      const brilho = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 32),
        new THREE.MeshBasicMaterial({ color: CORES.amarelo, transparent: true, opacity: 0.8, depthWrite: false }));
      brilho.rotation.x = -Math.PI / 2;
      brilho.position.y = 0.03;
      g.add(brilho);
      sombrear(g);
      g.position.set(b.x, 0, b.z);
      this.grupo.add(g);
      return { g, brilho };
    });
  }

  montarEncaixes(encaixes) {
    this.encaixes = encaixes.map(e => {
      const cor = e.cor ? CORES[e.cor] : CORES.amarelo;
      const g = new THREE.Group();
      g.position.set(e.x, this.alturaTerreno(Math.floor(e.x), Math.floor(e.z)), e.z);
      const moldura = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.48, 4, 1, Math.PI / 4),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.95, depthWrite: false }));
      moldura.rotation.x = -Math.PI / 2;
      moldura.position.y = 0.04;
      const fundo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62),
        new THREE.MeshBasicMaterial({ color: CORES.marinho, transparent: true, opacity: 0.25, depthWrite: false }));
      fundo.rotation.x = -Math.PI / 2;
      fundo.position.y = 0.03;
      const seta = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 4), plastico(cor, { emissive: cor, emissiveIntensity: 0.4 }));
      seta.rotation.x = Math.PI;
      seta.position.y = 1.2;
      g.add(fundo, moldura, seta);
      this.grupo.add(g);
      return { g, moldura, seta };
    });
  }

  // Marco de cada missão: mastro com o número; quando concluída fica dourada com a bandeira de chegada.
  montarMissoes(missoes) {
    this.missoes = missoes.map((m, i) => {
      const g = new THREE.Group();
      const y = this.alturaTerreno(Math.floor(m.x), Math.floor(m.z));
      g.position.set(m.x, y, m.z);
      const anel = new THREE.Mesh(new THREE.RingGeometry(m.todos ? 2.2 : 0.7, m.todos ? 2.45 : 0.9, 40),
        new THREE.MeshBasicMaterial({ color: CORES.amarelo, transparent: true, opacity: 0.85, depthWrite: false }));
      anel.rotation.x = -Math.PI / 2;
      anel.position.y = 0.04;
      const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 12), plastico('#FFFFFF'));
      mastro.position.y = 1.3;
      const placa = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNumero(i + 1, CORES.azul), depthTest: false }));
      placa.scale.set(0.95, 0.95, 1);
      placa.position.y = 3.05;
      placa.renderOrder = 34;
      g.add(anel, mastro, placa);
      let trofeu = null;
      if (m.final) {
        trofeu = new THREE.Group();
        const ouro = plastico('#F6BB33', { metalness: 0.4, emissive: '#F6BB33', emissiveIntensity: 0.15 });
        const taca = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.45, 0.05], [0.5, 0.5], [0.3, 0.75], [0.12, 0.85], [0.12, 1.15], [0.35, 1.25], [0, 1.25]]
          .map(([a, b]) => new THREE.Vector2(a, b)).reverse(), 32), ouro);
        taca.rotation.x = Math.PI;
        taca.position.y = 1.25;
        trofeu.add(taca);
        trofeu.position.set(0.9, 0, 0);
        trofeu.scale.setScalar(0.9);
        g.add(trofeu);
      }
      sombrear(g);
      this.grupo.add(g);
      return { g, anel, placa, mastro, trofeu, feita: false, numero: i + 1, def: m };
    });
  }

  montarPersonagens(lista) {
    const sombraTex = texturaRadial('rgba(15,20,45,0.5)');
    const anelTex = texturaAnel();
    const estrelas = tex('assets/particulas/estrelinha.png');
    const ajuda = texIcone(ICONE.acao, CORES.rosa);
    this.pers = lista.map(p => {
      const cor = CORES[PERS_COR[p.id]];
      // folhas de plataforma (sempre existem) e isométricas (quando o Codex gerar)
      const folhas = {};
      const carregar = (chave, url, n) => {
        const t = carregador.load(url, undefined, undefined, () => { delete folhas[chave]; });
        t.colorSpace = THREE.SRGBColorSpace;
        t.repeat.set(1 / n, 1);
        folhas[chave] = { t, n };
      };
      for (const [arq, n] of Object.values(ANIM_LADO)) if (!folhas[`lado:${arq}`]) carregar(`lado:${arq}`, `assets/personagens/${p.id}/${arq}.png`, n);
      const pedidas = new Set();
      for (const [suf, n] of Object.values(ANIM_ISO)) {
        const arqs = suf.startsWith('_') ? ['frente', 'costas'].map(lado => lado + suf) : [suf];
        for (const arq of arqs) {
          if (pedidas.has(arq)) continue;
          pedidas.add(arq);
          talvez(`assets/personagens/${p.id}/iso/${arq}.png`, t => { t.repeat.set(1 / n, 1); folhas[`iso:${arq}`] = { t, n }; });
        }
      }
      const geo = new THREE.PlaneGeometry(SPRITE_ALT, SPRITE_ALT * ESTICA);
      geo.translate(0, SPRITE_ALT * ESTICA * (0.5 - (1 - PES)), 0);
      const mat = new THREE.MeshBasicMaterial({ map: folhas['lado:idle'].t, transparent: true, alphaTest: 0.35, toneMapped: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = Math.PI / 4;
      mesh.renderOrder = 10;
      // silhueta na cor do time: só aparece onde um muro está na frente (depthFunc "maior")
      const fantasma = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: mat.map, color: cor, transparent: true, opacity: 0.55,
        alphaTest: 0.35, depthWrite: false, depthFunc: THREE.GreaterDepth, toneMapped: false, side: THREE.DoubleSide }));
      fantasma.renderOrder = 50;
      mesh.add(fantasma);
      const chao = (map, w, h, corMat) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ map, color: corMat, transparent: true, depthWrite: false, toneMapped: false }));
        m.rotation.x = -Math.PI / 2;
        this.grupo.add(m);
        return m;
      };
      const sombra = chao(sombraTex, 1.0, 1.0, '#ffffff');
      const anel = chao(anelTex, 1.4, 1.4, cor);
      anel.material.blending = THREE.AdditiveBlending;
      // caído: estrelinhas girando + pedido de ajuda
      const tontura = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: estrelas, depthTest: false, toneMapped: false }));
        s.scale.set(0.3, 0.3, 1);
        s.renderOrder = 35;
        tontura.add(s);
      }
      const pedido = new THREE.Sprite(new THREE.SpriteMaterial({ map: ajuda, depthTest: false, toneMapped: false }));
      pedido.scale.set(0.8, 0.8, 1);
      pedido.renderOrder = 36;
      tontura.add(pedido);
      tontura.visible = false;
      // planador
      const asa = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.8, 24, 1, true, -0.55, 1.1), plastico(cor, { side: THREE.DoubleSide }));
      asa.rotation.set(Math.PI / 2, Math.PI / 4, Math.PI);
      const planador = new THREE.Group();
      planador.add(asa);
      planador.visible = false;
      this.grupo.add(mesh, tontura, planador);
      return { id: p.id, mesh, sombra, anel, tontura, pedido, planador, folhas, anim: 'idle', inicioAnim: 0,
               x: p.x, z: p.z, y: 0, ang: 90, fx: 0, piscar: Math.random() * 4 };
    });
  }

  // ---------- estado ----------
  aplicarEstado(s) {
    if (!this.fase || !s?.iso) return;
    this.estado = s;
    s.ch.forEach(([x, z, y, ang, anim, fx], i) => {
      const p = this.pers[i];
      if (!p) return;
      Object.assign(p, { x, z, y, ang, fx });
      if (p.anim !== anim) { p.anim = anim; p.inicioAnim = this.relogio; }
    });
    s.gemas.forEach((pega, i) => { const g = this.gemas[i]; if (g) g.pega = !!pega; });
    const ativos = {};
    (this.fase.alavancas || []).forEach((a, i) => { ativos[a.id] = !!s.alav[i]; const m = this.alavancas[i]; if (m) m.alvo = s.alav[i] ? -0.6 : 0.6; });
    (this.fase.botoes || []).forEach((b, i) => { ativos[b.id] = !!s.bot[i]; const m = this.placas[i]; if (m) m.on = !!s.bot[i]; });
    (this.fase.missoes || []).forEach((m, i) => { ativos[m.id] = !!s.missoes[i]; });
    s.plat.forEach((h, i) => { const p = this.plataformas[i]; if (p) p.h = h; });
    for (const p of this.plataformas) for (const l of p.lampadas) l.l.material.emissiveIntensity = ativos[l.id] ? 1.8 : 0.05;
  }

  // Altura do chão sob (x, z), para a sombra dos personagens.
  chaoEm(x, z) {
    const c = Math.floor(x), l = Math.floor(z);
    let h = this.alturaTerreno(c, l);
    if (this.fase.mapa[l]?.[c] === '~') h = -0.3;
    (this.fase.plataformas || []).forEach((p, i) => {
      const ph = this.plataformas[i]?.h;
      if (ph !== null && ph !== undefined && c >= p.x && c < p.x + p.w && l >= p.z && l < p.z + p.d) h = ph;
    });
    this.estado?.caixas.forEach(([cx, cz, base]) => { if (Math.floor(cx) === c && Math.floor(cz) === l) h = base < 0 ? 0 : base + 1; });
    return h;
  }

  // ---------- quadro ----------
  quadro(dt) {
    this.relogio += dt;
    const t = this.relogio;
    if (!this.fase) return;
    const s = this.estado;

    for (const p of this.pers) this.desenharPersonagem(p, t);
    for (const g of this.gemas) {
      g.mesh.visible = !g.pega;
      if (g.cor === 'peca') g.mesh.rotation.y = t * 2 + g.fase;
      else g.mesh.userData.pano.rotation.y = Math.sin(t * 5 + g.fase) * 0.35;
      g.mesh.position.y = g.base + Math.sin(t * 3 + g.fase) * 0.08;
    }
    for (const a of this.alavancas) { a.ang += ((a.alvo ?? 0.6) - a.ang) * Math.min(1, dt * 12); a.piv.rotation.z = a.ang; }
    for (const b of this.placas) {
      b.tampa.position.y += ((b.on ? 0.07 : 0.14) - b.tampa.position.y) * Math.min(1, dt * 18);
      b.tampa.material.emissiveIntensity = b.on ? 0.8 : 0;
    }
    for (const p of this.plataformas) {
      const existe = p.h !== null && p.h !== undefined;
      if (p.tipo === 'ponte') {
        if (existe && !p.g.visible) { p.g.visible = true; p.aparecer = 0; }
        if (p.g.visible) { p.aparecer = Math.min(1, p.aparecer + dt * 2.5); p.g.scale.set(1, p.aparecer, p.aparecer); }
      }
      if (existe) p.g.position.y = p.h;
    }
    if (s) {
      s.obras.forEach(([prog, trab, precisa, pronta], i) => {
        const o = this.obras[i];
        if (!o) return;
        o.barra.visible = o.fantasma.visible = o.contorno.visible = !pronta;
        o.maos.forEach((m, k) => { m.visible = !pronta && k < Math.max(precisa, 1); m.material.opacity = k < trab ? 1 : 0.4; m.scale.setScalar(k < trab ? 0.62 : 0.5); });
        o.cheio.scale.x = Math.max(0.001, prog * 1.76);
        o.fantasma.material.opacity = 0.25 + Math.sin(t * 4) * 0.1;
      });
      s.caixas.forEach(([x, z, base, emp, precisa], i) => {
        const c = this.caixas[i];
        if (!c) return;
        c.g.position.set(x, base < 0 ? -0.94 : base, z);
        c.maos.forEach((m, k) => { m.visible = base >= 0 && k < precisa; m.material.opacity = k < emp ? 1 : 0.4; });
      });
      s.blocos.forEach(([x, z, y, preso], i) => {
        const b = this.blocos[i];
        if (!b) return;
        b.g.position.set(x, y, z);
        b.brilho.visible = !preso;
        b.brilho.material.opacity = 0.5 + Math.sin(t * 5) * 0.3;
      });
      s.enc.forEach((cheio, i) => {
        const e = this.encaixes[i];
        if (!e) return;
        e.seta.visible = !cheio;
        e.seta.position.y = 1.2 + Math.sin(t * 4) * 0.15;
        e.moldura.material.color.set(cheio ? CORES.verde : CORES.amarelo);
      });
      s.missoes.forEach((feita, i) => {
        const m = this.missoes[i];
        if (!m) return;
        const liberada = !m.def.depois || m.def.depois.every(id => s.missoes[this.fase.missoes.findIndex(o => o.id === id)]);
        if (feita && !m.feita) { m.feita = true; m.placa.material.map = texNumero('✓', CORES.verde); }
        m.anel.visible = !feita && liberada;
        m.anel.material.opacity = 0.55 + Math.sin(t * 3) * 0.3;
        m.placa.material.opacity = liberada || feita ? 1 : 0.45;
        if (m.trofeu) m.trofeu.rotation.y = t * 0.8;
      });
    }
    // setas-guia: próximo lugar da missão de cada personagem seguido
    const comGuia = this.ativo ? [this.ativo] : this.vistas.map(v => v.id).filter(Boolean);
    this.guias.forEach((guia, k) => {
      const id = comGuia[k];
      const i = id ? this.fase.personagens.findIndex(p => p.id === id) : -1;
      const b = s && i >= 0 ? bussola(this.fase, s, i) : null;
      const mostrar = !!b && !b.perto;
      guia.g.visible = guia.anel.visible = mostrar;
      if (!mostrar) return;
      const [x, z] = b.alvo;
      const h = this.chaoEm(x, z);
      const cor = CORES[PERS_COR[id]];
      guia.mat.color.set(cor); guia.mat.emissive.set(cor);
      guia.anel.material.color.set(cor);
      guia.g.position.set(x, h + 2.2 + Math.sin(t * 4) * 0.25, z);
      guia.g.rotation.y = t * 1.5;
      guia.anel.position.set(x, h + 0.05, z);
      guia.anel.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
    });
    for (const a of this.agua) a.m.position.y = -0.35 + Math.sin(t * 1.6 + a.fase) * 0.025;
    this.atualizarParticulas(dt);

    // câmeras: cada vista segue o seu personagem (ou o mapa todo)
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    this.vistas.forEach((v, i) => {
      const alvo = this.alvoDaVista(v);
      v.alvo = v.alvo ? v.alvo.lerp(alvo, Math.min(1, dt * 5)) : alvo.clone();
      v.cam.position.copy(v.alvo).addScaledVector(DIR_CAM, 40);
      v.cam.lookAt(v.alvo);
      const w = W / this.vistas.length;
      this.renderer.setViewport(i * w, 0, w, H);
      this.renderer.setScissor(i * w, 0, w, H);
      this.renderer.render(this.cena, v.cam);
    });
  }

  alvoDaVista(v) {
    const ps = (v.ids || []).map(id => this.pers.find(q => q.id === id)).filter(Boolean);
    if (!ps.length) return new THREE.Vector3(this.C / 2, 0, this.L / 2);
    const m = k => ps.reduce((a, p) => a + p[k], 0) / ps.length;
    return new THREE.Vector3(m('x'), Math.max(0, m('y')) + 0.8, m('z'));
  }

  desenharPersonagem(p, t) {
    // vira para a câmera: frente se anda para baixo na tela; espelha se anda para a esquerda
    const a = p.ang * Math.PI / 180;
    const telaX = Math.cos(a) - Math.sin(a), telaY = Math.cos(a) + Math.sin(a);
    const lado = telaY >= -0.15 ? 'frente' : 'costas';
    const anim = p.anim === 'vitoria' ? 'vitoria' : p.anim;
    const iso = ANIM_ISO[anim];
    let folha = null;
    if (iso) folha = p.folhas[iso[0].startsWith('_') ? `iso:${lado}${iso[0]}` : `iso:${iso[0]}`];
    if (!folha) folha = p.folhas[`lado:${(ANIM_LADO[anim] || ANIM_LADO.idle)[0]}`] || p.folhas['lado:idle'];
    const n = folha.n;
    let q = Math.floor((t - p.inicioAnim) * (FPS[anim] || 3)) % n;
    if (anim === 'idle') q = ((t + p.piscar) % 3.2) > 3.05 ? 1 : 0;
    if (anim === 'carregar_parado') q = 0;
    folha.t.offset.x = q / n;
    p.mesh.material.map = folha.t;
    p.mesh.children[0].material.map = folha.t;
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.scale.x = telaX < -0.05 && anim !== 'caido' ? -1 : 1;
    p.mesh.visible = !(p.fx & FX.INVUL) || Math.floor(t * 12) % 2 === 0;
    const h = this.chaoEm(p.x, p.z);
    const noAr = p.y > h + 0.05;
    p.sombra.position.set(p.x, h + 0.03, p.z);
    p.sombra.scale.setScalar(noAr ? 0.7 : 1);
    p.anel.position.set(p.x, h + 0.04, p.z);
    p.anel.visible = anim !== 'caido';
    p.anel.material.opacity = noAr ? 0.5 : 1;
    const caido = anim === 'caido';
    p.tontura.visible = caido;
    if (caido) {
      p.tontura.position.set(p.x, p.y + 1.4, p.z);
      p.tontura.children.forEach((s, i) => {
        if (s === p.pedido) return;
        const ang = t * 3 + (i * Math.PI * 2) / 3;
        s.position.set(Math.cos(ang) * 0.45, Math.sin(ang * 2) * 0.05, Math.sin(ang) * 0.45);
      });
      p.pedido.position.set(0, 1.0 + Math.sin(t * 5) * 0.12, 0);
      const k = 0.75 + Math.sin(t * 6) * 0.1 + (p.fx & FX.CAIDO_SEM_CORACAO ? 0.2 : 0);
      p.pedido.scale.set(k, k, 1);
    }
    p.planador.visible = !!(p.fx & FX.PLANANDO);
    p.planador.position.set(p.x, p.y + 2.5, p.z);
  }

  redimensionar() {
    const W = this.canvas.clientWidth || innerWidth, H = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(W, H, false);
    const n = Math.max(1, this.vistas.length);
    for (const v of this.vistas) {
      const aspecto = (W / n) / H;
      // altura visível em tiles: plateia vê o mapa todo; celular vê menos (fica maior na tela)
      let alt = this.celular ? 10 : 12;
      if (!v.ids?.length && this.fase) alt = Math.max(this.L * 0.95, (this.C * 0.85) / aspecto);
      v.cam.top = alt / 2; v.cam.bottom = -alt / 2;
      v.cam.left = -alt * aspecto / 2; v.cam.right = alt * aspecto / 2;
      v.cam.updateProjectionMatrix();
    }
  }

  // Posição em pixels (na tela inteira) de um ponto do mundo, em cada vista onde ele aparece.
  projetarTodas(x, y, z) {
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight, w = W / Math.max(1, this.vistas.length);
    const out = [];
    this.vistas.forEach((v, i) => {
      const p = new THREE.Vector3(x, y, z).project(v.cam);
      if (Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return;
      out.push({ x: i * w + (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * H, vista: i });
    });
    return out;
  }

  // ---------- efeitos ----------
  efeito(ev) {
    if (!this.fase) return;
    const p = ev.id ? this.pers.find(q => q.id === ev.id) : null;
    const em = (x, y, z, nomes, n, forca, tam) => this.explosao(x, y, z, nomes, n, forca, tam);
    if (ev.e === 'bandeira') em(ev.x, ev.y, ev.z, [`brilho_${ev.cor}`, 'estrelinha', 'brilho_branco'], 16, 3.5, 0.32);
    else if (ev.e === 'peca') em(ev.x, ev.y, ev.z, ['bloquinho_azul', 'bloquinho_rosa', 'bloquinho_amarelo', 'bloquinho_verde'], 6, 2.2, 0.22);
    else if (ev.e === 'caiu' && p) em(ev.x, ev.y + 0.3, ev.z, ['gota_azul', 'brilho_azul', 'brilho_branco'], 14, 3, 0.28);
    else if ((ev.e === 'ajudou' || ev.e === 'levantou') && p) em(ev.x, ev.y + 1, ev.z, [`brilho_${PERS_COR[ev.id]}`, 'estrelinha'], 16, 3, 0.3);
    else if (ev.e === 'missao') {
      em(ev.x, ev.y + 2.5, ev.z, ['bloquinho_azul', 'bloquinho_rosa', 'bloquinho_amarelo', 'bloquinho_verde', 'estrelinha'], 34, 6, 0.32);
    } else if (ev.e === 'construir') {
      const o = this.fase.obras.find(q => q.id === ev.id);
      if (o) em(o.x + o.w / 2, 0.5, o.z + o.d / 2, ['bloquinho_azul', 'bloquinho_rosa', 'bloquinho_amarelo', 'bloquinho_verde', 'poeira'], 30, 5, 0.3);
    } else if (ev.e === 'encaixe') em(ev.x, ev.y + 0.6, ev.z, ['estrelinha', 'brilho_amarelo'], 18, 3, 0.3);
    else if (ev.e === 'empurrou' || ev.e === 'pousou') em(ev.x, (ev.y ?? 0) + 0.1, ev.z, ['poeira'], 5, 1.5, 0.35);
    else if (ev.e === 'afundou') em(ev.x, 0, ev.z, ['gota_azul', 'brilho_azul'], 16, 3.5, 0.3);
    else if (ev.e === 'pouso' && p) em(p.x, p.y + 0.05, p.z, ['poeira'], 4, 1.4, 0.3);
    else if (ev.e === 'vitoria') for (const q of this.pers)
      em(q.x, q.y + 1.5, q.z, ['bloquinho_azul', 'bloquinho_rosa', 'bloquinho_amarelo', 'bloquinho_verde', 'estrelinha'], 30, 7, 0.32);
  }

  explosao(x, y, z, nomes, n, forca, tamanho = 0.32) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(`assets/particulas/${nomes[i % nomes.length]}.png`), transparent: true, depthWrite: false, toneMapped: false }));
      const tam = tamanho * (0.6 + Math.random() * 0.8);
      s.scale.set(tam, tam, 1);
      s.position.set(x, y, z);
      s.renderOrder = 40;
      const a = Math.random() * Math.PI * 2;
      const v = forca * (0.4 + Math.random() * 0.6);
      this.grupo.add(s);
      this.particulas.push({ s, vx: Math.cos(a) * v * 0.6, vz: Math.sin(a) * v * 0.6, vy: Math.random() * v + forca * 0.4,
                             vida: 0.8 + Math.random() * 0.6, giro: (Math.random() - 0.5) * 8 });
    }
  }

  atualizarParticulas(dt) {
    this.particulas = this.particulas.filter(p => {
      p.vida -= dt;
      if (p.vida <= 0) { this.grupo.remove(p.s); p.s.material.dispose(); return false; }
      p.vy -= 12 * dt;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      p.s.material.rotation += p.giro * dt;
      p.s.material.opacity = Math.min(1, p.vida / 0.4);
      return true;
    });
  }
}

// Formas 3D provisórias dos enfeites (até chegarem os sprites do Codex). Cores calmas: cor forte é só dos times.
const TAMANHO_ENFEITE = {
  arvore: [2.0, 3.0], arbusto: [1.4, 0.95], flores: [0.9, 0.7], pedra: [0.9, 0.7], placa: [0.8, 1.0],
  pilha_blocos: [1.3, 1.3], guindaste: [2.6, 3.5], cone: [0.6, 0.8], carrinho: [1.3, 1.1],
};
const FORMAS = {
  arvore() {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.1, 10), fosco('#9B6B43'));
    tronco.position.y = 0.55;
    const copa = fosco('#86B86A');
    for (const [x, y, z, r] of [[0, 1.6, 0, 0.75], [0.35, 1.35, 0.2, 0.5], [-0.3, 1.4, -0.15, 0.55], [0, 2.05, 0, 0.5]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), copa);
      b.position.set(x, y, z);
      g.add(b);
    }
    g.add(tronco);
    return g;
  },
  arbusto() {
    const g = new THREE.Group();
    for (const [x, z, r] of [[0, 0, 0.4], [0.3, 0.1, 0.3], [-0.3, -0.05, 0.32]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), fosco('#8FBF73'));
      b.position.set(x, r * 0.7, z);
      g.add(b);
    }
    return g;
  },
  flores() {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), fosco(i % 2 ? '#FFFFFF' : '#FBE7A1'));
      f.position.set(Math.cos(a) * 0.25, 0.12, Math.sin(a) * 0.25);
      g.add(f);
    }
    return g;
  },
  pedra() {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), fosco('#CFC6B4'));
    m.scale.set(1.2, 0.7, 1);
    m.position.y = 0.18;
    return m;
  },
  pilha_blocos() {
    const g = new THREE.Group();
    [[0, 0, 0, '#3E93D0'], [0.45, 0, 0.1, '#E3205D'], [0.2, 0.42, 0.05, '#F6BB33'], [-0.3, 0, -0.3, '#A0C630']].forEach(([x, y, z, c]) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.4, 0.5, 2, 0.05), plastico(c));
      b.position.set(x, y + 0.2, z);
      g.add(b);
    });
    return g;
  },
  cone() {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), plastico('#F39A3D'));
    c.position.y = 0.32;
    const faixa = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 16), plastico('#FFFFFF'));
    faixa.position.y = 0.35;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), plastico('#F39A3D'));
    base.position.y = 0.025;
    g.add(c, faixa, base);
    return g;
  },
  carrinho() {
    const g = new THREE.Group();
    const caixa = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.35, 0.5, 2, 0.05), fosco('#C98B4E'));
    caixa.position.y = 0.4;
    const roda = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 8, 16), fosco('#5B4636'));
    roda.position.set(0.45, 0.15, 0);
    g.add(caixa, roda);
    return g;
  },
  guindaste() {
    const g = new THREE.Group();
    const amarelo = plastico('#F6BB33');
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), amarelo);
    torre.position.y = 1.6;
    const braco = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 0.25), amarelo);
    braco.position.set(0.7, 3.2, 0);
    const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), fosco('#1E2A4A'));
    cabo.position.set(1.7, 2.5, 0);
    const bloco = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.3, 0.4, 2, 0.05), plastico('#3E93D0'));
    bloco.position.set(1.7, 1.8, 0);
    g.add(torre, braco, cabo, bloco);
    g.rotation.y = -Math.PI / 4;
    return g;
  },
  placa() {
    const g = new THREE.Group();
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), fosco('#9B6B43'));
    poste.position.y = 0.5;
    const tabua = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.4, 0.06, 2, 0.03), fosco('#D9A86C'));
    tabua.position.y = 0.9;
    tabua.rotation.y = Math.PI / 4;
    g.add(poste, tabua);
    return g;
  },
};
