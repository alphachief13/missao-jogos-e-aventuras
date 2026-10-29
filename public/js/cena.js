// Cena 2.5D: blocos de plástico em 3D, personagens em sprites, fundos pintados atrás.
// Mundo da simulação: x para a direita, y para baixo (tiles). Three: X = x, Y = -y.
// Regra de cor: a estrutura usa tons de terra e grama suaves (combina com o fundo pintado); cor forte = time.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CORES, PERS_COR, COR_PERS } from './comum.js';

const NEUTRO = { creme: '#F3E7CC', cinza: '#E0CBA5', moldura: '#8A6A48', grama: '#5F8A4A', mecanismo: '#FFFFFF' };
// Fundo empurrado para longe: desfoque, névoa clara e menos saturação, para os objetos 3D se destacarem.
const NEVOA = { longe: { desfoque: 1.6, nevoa: 0.3, cinza: 0.25 }, meio: { desfoque: 0.7, nevoa: 0.12, cinza: 0.1 } };
// Poças de tinta (cada time só pisa na sua cor) e o curto-circuito, que derruba todos.
const POCA = { b: 'azul', r: 'rosa', y: 'amarelo', g: 'verde', x: null };
const FX = { INVUL: 1, PLANANDO: 4, TEM_MOLA: 8, TEM_PLANADOR: 16 };
const CORES_PECA = ['#3E93D0', '#E3205D', '#F6BB33', '#A0C630'];
const ANIMS = { idle: 2, corrida: 4, pulo: 1, queda: 1, empurrar: 1, derrota: 1, vitoria: 1, aceno: 1 };
const FPS = { corrida: 10 };
const SPRITE_ALT = 2.13;               // célula 384 px em tiles
const PES = 376 / 384;                 // linha dos pés dentro da célula
const VISTA = { w: 24, h: 13.5 };       // área da fase que precisa caber na tela

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
const retrato = cor => tex(`/assets/personagens/${COR_PERS[cor]}/retrato.png`);

// Blocos da fase: plástico fosco, menos brilho que os objetos de time.
function fosco(cor, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.6, clearcoat: 0.35, clearcoatRoughness: 0.4, ...extra });
}
function plastico(cor, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, ...extra });
}
function icone(map, tam, x, y, z = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, toneMapped: false, depthWrite: false }));
  s.scale.set(tam, tam, 1);
  s.position.set(x, y, z);
  s.renderOrder = 15;
  return s;
}

export class Cena {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.cena = new THREE.Scene();
    this.cena.background = new THREE.Color(CORES.marinho);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.cena.environmentIntensity = 0.55;

    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);
    // luz de dia ensolarado, vinda do mesmo lado do sol pintado no fundo
    this.cena.add(new THREE.HemisphereLight('#dcecff', '#8a7a55', 1.0));
    const sol = new THREE.DirectionalLight('#fff0d4', 2.3);
    sol.position.set(5, 10, 12);
    this.cena.add(sol);

    this.fase = null;
    this.grupo = null;
    this.tremor = 0;
    this.particulas = [];
    this.relogio = 0;
    addEventListener('resize', () => this.redimensionar());
  }

  // ---------- montagem da fase ----------
  carregarFase(fase) {
    if (this.grupo) this.cena.remove(this.grupo);
    this.fase = fase;
    this.grupo = new THREE.Group();
    this.cena.add(this.grupo);
    this.particulas = [];
    this.linhas = fase.mapa.length;
    this.centro = new THREE.Vector3(VISTA.w / 2, -(this.linhas - VISTA.h / 2), 0);
    this.timesEmJogo = new Set(fase.personagens.map(p => PERS_COR[p.id]));
    this.coresGatilho = {};
    for (const a of fase.alavancas || []) this.coresGatilho[a.id] = a.cor;
    for (const b of fase.botoes || []) this.coresGatilho[b.id] = b.cor;

    this.montarFundos(fase.mundo);
    this.montarBlocos(fase.mapa);
    this.montarPocas(fase.mapa);
    this.montarGemas(fase.gemas);
    this.montarPortais(fase.portais);
    this.montarAlavancas(fase.alavancas || []);
    this.montarBotoes(fase.botoes || []);
    this.montarPlataformas(fase.plataformas || []);
    this.montarPersonagens(fase.personagens);
    this.redimensionar();
  }

  montarFundos(mundo) {
    const plano = (url, transp, ajuste) => {
      const mat = new THREE.MeshBasicMaterial({ map: tex(url), transparent: transp, depthWrite: !transp, toneMapped: false });
      afastar(mat, ajuste);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      this.grupo.add(m);
      return m;
    };
    this.fundos = [
      { mesh: plano(`/assets/fundos/${mundo}/longe.png`, false, NEVOA.longe), z: -26, parallax: 0.25 },
      { mesh: plano(`/assets/fundos/${mundo}/meio.png`, true, NEVOA.meio), z: -9, parallax: 0.6 },
    ];
  }

  montarBlocos(mapa) {
    const blocos = [], pinos = [], gramas = [];
    const solido = (c, l) => mapa[l]?.[c] === '#';
    for (let l = 0; l < mapa.length; l++) {
      for (let c = 0; c < mapa[l].length; c++) {
        if (mapa[l][c] !== '#') continue;
        const borda = c === 0 || c === mapa[l].length - 1 || l === 0;
        // piso de cima creme com placa de grama, miolo areia, moldura de madeira
        const exposto = !solido(c, l - 1) && l > 0;
        const cor = new THREE.Color(borda ? NEUTRO.moldura : exposto ? NEUTRO.creme : NEUTRO.cinza);
        if ((c + l) % 2) cor.offsetHSL(0, 0, -0.03);
        blocos.push({ x: c + 0.5, y: -(l + 0.5), cor });
        if (exposto && !borda) {
          const verde = new THREE.Color(NEUTRO.grama).offsetHSL(0, 0, ((c * 7) % 3 - 1) * 0.02);
          gramas.push({ x: c + 0.5, y: -l - 0.06, cor: verde });
          for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25])
            pinos.push({ x: c + 0.5 + dx, y: -l + 0.12, z: dz, cor: verde });
        }
      }
    }
    this.grupo.add(instanciado(new RoundedBoxGeometry(0.98, 0.98, 1, 2, 0.09), fosco('#fff'), blocos));
    this.grupo.add(instanciado(new RoundedBoxGeometry(1.0, 0.2, 1.04, 2, 0.06), fosco('#fff'), gramas));
    this.grupo.add(instanciado(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 16), fosco('#fff'), pinos));
  }

  montarPocas(mapa) {
    this.pocas = [];
    const aviso = texturaAviso();
    for (let l = 0; l < mapa.length; l++) {
      let c = 0;
      while (c < mapa[l].length) {
        const t = mapa[l][c];
        if (!(t in POCA)) { c++; continue; }
        let n = 1;
        while (mapa[l][c + n] === t) n++;
        const cor = POCA[t];
        const hex = cor ? CORES[cor] : CORES.marinho;
        const base = new THREE.Mesh(new RoundedBoxGeometry(n - 0.02, 0.5, 1, 2, 0.06), fosco(NEUTRO.cinza));
        base.position.set(c + n / 2, -(l + 0.75), 0);
        // tinta: superfície lisa e brilhante; o curto-circuito é escuro e solta faíscas
        const tinta = new THREE.Mesh(new RoundedBoxGeometry(n - 0.08, 0.34, 0.86, 3, 0.12),
          new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
                                            emissive: cor ? hex : '#3d6bff', emissiveIntensity: cor ? 0.12 : 0.25 }));
        tinta.position.set(c + n / 2, -(l + 0.32), 0);
        this.grupo.add(base, tinta);
        // Quem passa: retrato do time. Curto-circuito ou time fora da partida: placa de perigo.
        const temDono = cor && this.timesEmJogo.has(cor);
        const marca = icone(temDono ? retrato(cor) : aviso, 0.5, c + n / 2, -(l - 0.45), 0.7);
        this.grupo.add(marca);
        this.pocas.push({ tinta, marca, y0: marca.position.y, curto: !cor, x: c, n, l, fase: Math.random() * 6 });
        c += n;
      }
    }
  }

  montarGemas(gemas) {
    // peça de montar (moeda da equipe) e bandeirinha do time
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
        const topo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), plastico(CORES[g.cor]));
        topo.position.y = 0.42;
        grupo.add(mastro, pano, topo);
        grupo.userData.pano = pano;
      }
      grupo.position.set(g.x, -g.y, 0.1);
      this.grupo.add(grupo);
      return { mesh: grupo, base: -g.y, fase: i * 0.7, pega: false, cor: g.cor };
    });
  }

  // Chegada de cada time: arco de blocos na cor do time, com a bandeira e o retrato em cima.
  montarPortais(portais) {
    this.portais = portais.map(p => {
      const g = new THREE.Group();
      g.position.set(p.x, -p.y, -0.2);
      const mat = plastico(CORES[p.cor]);
      for (const dx of [-0.62, 0.62]) {
        const poste = new THREE.Mesh(new RoundedBoxGeometry(0.3, 2.0, 0.5, 2, 0.08), mat);
        poste.position.set(dx, 1.0, 0);
        g.add(poste);
      }
      const viga = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.32, 0.55, 2, 0.08), mat);
      viga.position.y = 2.1;
      const brilho = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 1.9), materialChegada(CORES[p.cor]));
      brilho.position.set(0, 0.95, -0.05);
      g.add(viga, brilho, icone(retrato(p.cor), 0.6, 0, 2.62, 0.25));
      this.grupo.add(g);
      return { g, disco: brilho, brilho: 0, cor: p.cor };
    });
  }

  montarAlavancas(alavancas) {
    this.alavancas = alavancas.map(a => {
      const cor = a.cor ? CORES[a.cor] : NEUTRO.mecanismo;
      const g = new THREE.Group();
      g.position.set(a.x, -a.y, 0.1);
      const base = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.28, 0.6, 2, 0.08), plastico(cor));
      base.position.y = 0.14;
      const piv = new THREE.Group();
      piv.position.y = 0.26;
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 12), plastico(CORES.marinho));
      haste.position.y = 0.31;
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), plastico(cor, { emissive: cor, emissiveIntensity: 0.15 }));
      bola.position.y = 0.64;
      piv.add(haste, bola);
      g.add(base, piv);
      if (a.cor) g.add(icone(retrato(a.cor), 0.5, 0, 1.25));
      this.grupo.add(g);
      return { piv, ang: 0.6 };
    });
  }

  montarBotoes(botoes) {
    this.botoes = botoes.map(b => {
      const cor = b.cor ? CORES[b.cor] : NEUTRO.mecanismo;
      const g = new THREE.Group();
      g.position.set(b.x, -b.y, 0);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.1, 28), plastico(CORES.marinho));
      base.position.y = 0.05;
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.14, 28), plastico(cor, { emissive: b.cor ? cor : '#9fe3ff', emissiveIntensity: 0 }));
      tampa.position.y = 0.16;
      g.add(base, tampa);
      if (b.cor) g.add(icone(retrato(b.cor), 0.5, 0, 0.9));
      this.grupo.add(g);
      return { tampa };
    });
  }

  montarPlataformas(plats) {
    this.plataformas = plats.map(p => {
      const g = new THREE.Group();
      const lampadas = [];
      if (p.tipo === 'portao') {
        // coluna de blocos brancos com faixas marinho + uma lâmpada por gatilho (na cor de quem aciona)
        for (let i = 0; i < Math.round(p.h); i++) {
          const b = new THREE.Mesh(new RoundedBoxGeometry(p.w - 0.04, 0.96, 0.9, 2, 0.08), plastico(i % 2 ? NEUTRO.creme : '#FFFFFF'));
          b.position.y = p.h / 2 - 0.5 - i;
          const faixa = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.1, 0.12, 0.92), plastico(CORES.marinho));
          faixa.position.y = b.position.y + 0.3;
          g.add(b, faixa);
        }
        (p.gatilhos || []).forEach((id, i) => {
          const cor = this.coresGatilho[id] ? CORES[this.coresGatilho[id]] : '#9fe3ff';
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.05 }));
          l.position.set(0, -p.h / 2 + 0.35 + i * 0.3, 0.48);
          g.add(l);
          lampadas.push({ l, id });
        });
      } else {
        const corpo = new THREE.Mesh(new RoundedBoxGeometry(p.w - 0.04, p.h, 1, 2, 0.08), plastico('#FFFFFF'));
        const faixa = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.1, 0.1, 1.02), plastico(CORES.marinho));
        faixa.position.y = -p.h / 2 + 0.12;
        g.add(corpo, faixa);
        for (let i = 0; i < p.w * 2; i++) for (const dz of [-0.25, 0.25]) {
          const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 16), plastico('#FFFFFF'));
          pino.position.set(-p.w / 2 + 0.25 + i * 0.5, p.h / 2 + 0.07, dz);
          g.add(pino);
        }
        // trilho mostra o caminho
        const x2 = p.x2 ?? p.x, y2 = p.y2 ?? p.y;
        const comp = Math.hypot(x2 - p.x, y2 - p.y);
        if (comp > 0.1) {
          const trilho = new THREE.Mesh(new THREE.BoxGeometry(0.07, comp, 0.07), plastico('#ffffff', { transparent: true, opacity: 0.55 }));
          trilho.position.set((p.x + x2) / 2 + p.w / 2, -((p.y + y2) / 2 + p.h / 2), -0.45);
          trilho.rotation.z = Math.atan2(x2 - p.x, y2 - p.y);
          this.grupo.add(trilho);
        }
      }
      this.grupo.add(g);
      return { g, w: p.w, h: p.h, lampadas, x: p.x, y: p.y };
    });
  }

  montarPersonagens(lista) {
    const sombraTex = texturaRadial('rgba(15,20,45,0.55)');
    const anelTex = texturaAnel();
    this.pers = lista.map(p => {
      const cor = CORES[PERS_COR[p.id]];
      const sheets = {};
      for (const [anim, n] of Object.entries(ANIMS)) {
        const t = carregador.load(`/assets/personagens/${p.id}/${anim}.png`);
        t.colorSpace = THREE.SRGBColorSpace;
        t.repeat.set(1 / n, 1);
        sheets[anim] = t;
      }
      const mat = new THREE.MeshBasicMaterial({ map: sheets.idle, transparent: true, alphaTest: 0.04, depthWrite: false, toneMapped: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SPRITE_ALT, SPRITE_ALT), mat);
      mesh.renderOrder = 10;
      const chao = (map, w, h, corMat, ordem) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ map, color: corMat, transparent: true, depthWrite: false, toneMapped: false }));
        m.rotation.x = -Math.PI / 2;
        m.renderOrder = ordem;
        this.grupo.add(m);
        return m;
      };
      const sombra = chao(sombraTex, 1.1, 0.5, '#ffffff', 5);
      const anel = chao(anelTex, 1.7, 0.85, cor, 6); // anel do time nos pés
      anel.material.blending = THREE.AdditiveBlending;

      // tênis de mola: duas molinhas na cor do time embaixo dos pés
      const mola = new THREE.Group();
      const helice = new THREE.TubeGeometry(new (class extends THREE.Curve {
        getPoint(t, alvo = new THREE.Vector3()) { const a = t * Math.PI * 8; return alvo.set(Math.cos(a) * 0.09, t * 0.22, Math.sin(a) * 0.09); }
      })(), 48, 0.022, 6);
      for (const dx of [-0.16, 0.16]) { const m = new THREE.Mesh(helice, plastico(cor)); m.position.x = dx; mola.add(m); }
      mola.visible = false;
      // planador: asa curva acima da cabeça
      const asa = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.9, 24, 1, true, -0.55, 1.1),
        plastico(cor, { side: THREE.DoubleSide }));
      asa.rotation.set(Math.PI / 2, 0, Math.PI);
      const planador = new THREE.Group();
      planador.add(asa);
      for (const dx of [-0.55, 0.55]) {
        const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), plastico(CORES.marinho));
        fio.position.set(dx * 0.6, -0.45, 0);
        fio.rotation.z = dx > 0 ? 0.45 : -0.45;
        planador.add(fio);
      }
      planador.visible = false;
      this.grupo.add(mesh, mola, planador);
      return { id: p.id, mesh, sombra, anel, mola, planador, sheets, anim: 'idle', x: p.x, y: p.y, dir: 1, fx: 0, inicioAnim: 0, piscar: Math.random() * 4 };
    });
  }

  // ---------- atualização por quadro ----------
  aplicarEstado(s) {
    if (!this.fase || !s) return;
    s.ch.forEach(([x, y, dir, anim, , fx], i) => {
      const p = this.pers[i];
      if (!p) return;
      p.x = x; p.y = y; p.dir = dir; p.fx = fx || 0;
      if (p.anim !== anim) { p.anim = anim; p.inicioAnim = this.relogio; }
    });
    s.gemas.forEach((pega, i) => { const g = this.gemas[i]; if (g) g.pega = !!pega; });
    const ativos = {};
    (this.fase.alavancas || []).forEach((a, i) => { ativos[a.id] = !!s.alav[i]; const m = this.alavancas[i]; if (m) m.alvo = s.alav[i] ? -0.6 : 0.6; });
    (this.fase.botoes || []).forEach((b, i) => { ativos[b.id] = !!s.bot[i]; const m = this.botoes[i]; if (m) m.on = !!s.bot[i]; });
    s.plat.forEach(([x, y], i) => { const p = this.plataformas[i]; if (p) { p.px = x; p.py = y; } });
    for (const p of this.plataformas) for (const l of p.lampadas) l.l.material.emissiveIntensity = ativos[l.id] ? 1.6 : 0.05;
    s.ch.forEach(([, , , , noPortal], i) => {
      const portal = this.portais.find(o => o.cor === PERS_COR[this.pers[i]?.id]);
      if (portal) portal.ativo = !!noPortal;
    });
  }

  quadro(dt) {
    this.relogio += dt;
    const t = this.relogio;
    if (!this.fase) { this.renderer.render(this.cena, this.camera); return; }

    for (const p of this.pers) {
      const n = ANIMS[p.anim];
      let q = Math.floor((t - p.inicioAnim) * (FPS[p.anim] || 3)) % n;
      if (p.anim === 'idle') q = ((t + p.piscar) % 3.2) > 3.05 ? 1 : 0;
      const sheet = p.sheets[p.anim];
      sheet.offset.x = q / n;
      p.mesh.material.map = sheet;
      p.mesh.position.set(p.x, -p.y + (PES - 0.5) * SPRITE_ALT, 0.05);
      p.mesh.scale.x = p.dir;
      p.mesh.visible = !(p.fx & FX.INVUL) || Math.floor(t * 12) % 2 === 0;
      const noAr = p.anim === 'pulo' || p.anim === 'queda';
      p.sombra.visible = !noAr;
      p.sombra.position.set(p.x, -p.y + 0.02, 0.05);
      p.anel.visible = p.anim !== 'derrota';
      p.anel.position.set(p.x, -p.y + 0.03, 0.05);
      p.anel.material.opacity = noAr ? 0.5 : 1;
      // power-ups
      p.mola.visible = !!(p.fx & FX.TEM_MOLA) && p.anim !== 'derrota';
      p.mola.position.set(p.x, -p.y - 0.02, 0.15);
      p.mola.scale.y = noAr ? 1.5 : 1;
      p.planador.visible = !!(p.fx & FX.PLANANDO);
      p.planador.position.set(p.x, -p.y + 2.35, 0.05);
    }
    for (const g of this.gemas) {
      g.mesh.visible = !g.pega;
      if (g.cor === 'peca') g.mesh.rotation.y = t * 2 + g.fase;
      else g.mesh.userData.pano.rotation.y = Math.sin(t * 5 + g.fase) * 0.35; // bandeira tremulando
      g.mesh.position.y = g.base + Math.sin(t * 3 + g.fase) * 0.06;
    }
    for (const a of this.alavancas) { a.ang += ((a.alvo ?? 0.6) - a.ang) * Math.min(1, dt * 12); a.piv.rotation.z = a.ang; }
    for (const b of this.botoes) {
      b.tampa.position.y += ((b.on ? 0.08 : 0.16) - b.tampa.position.y) * Math.min(1, dt * 18);
      b.tampa.material.emissiveIntensity = b.on ? 0.7 : 0;
    }
    for (const p of this.plataformas) {
      const x = p.px ?? p.x, y = p.py ?? p.y;
      p.g.position.set(x + p.w / 2, -(y + p.h / 2), 0);
    }
    for (const p of this.portais) {
      p.brilho += ((p.ativo ? 1 : 0) - p.brilho) * Math.min(1, dt * 6);
      p.disco.material.uniforms.tempo.value = t;
      p.disco.material.uniforms.brilho.value = p.brilho;
      p.g.scale.setScalar(1 + p.brilho * 0.04);
    }
    for (const p of this.pocas) {
      p.tinta.scale.y = 1 + Math.sin(t * 2 + p.fase) * 0.05;
      p.marca.position.y = p.y0 + Math.sin(t * 2.2 + p.fase) * 0.06;
      if (p.curto && Math.random() < dt * 3) this.explosao(p.x + Math.random() * p.n, p.l + 0.1, ['faisca', 'brilho_azul'], 2, 1.6, 0.25);
    }
    this.atualizarParticulas(dt);

    const bal = Math.sin(t * 0.25) * 0.25;
    this.tremor = Math.max(0, this.tremor - dt * 2.5);
    const tr = this.tremor * this.tremor * 0.35;
    this.camera.position.set(this.centro.x + bal + (Math.random() - 0.5) * tr, this.centro.y + 2.2 + (Math.random() - 0.5) * tr, this.distancia);
    this.camera.lookAt(this.centro.x + bal * 0.6, this.centro.y, 0);
    this.posicionarFundos(bal);
    this.renderer.render(this.cena, this.camera);
  }

  redimensionar() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const tg = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.distancia = Math.max((VISTA.h / 2) / tg, (VISTA.w / 2) / (tg * this.camera.aspect)) * 1.04 + 0.5;
    this.camera.updateProjectionMatrix();
  }

  posicionarFundos(bal) {
    const tg = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    for (const f of this.fundos) {
      const dist = this.distancia - f.z;
      const alt = 2 * dist * tg * 1.12;
      const larg = alt * this.camera.aspect;
      const proporcao = 2400 / 1080;
      const W = Math.max(larg, alt * proporcao), H = W / proporcao;
      f.mesh.scale.set(W, H, 1);
      const k = dist / this.distancia;
      f.mesh.position.set(this.camera.position.x + (this.centro.x + bal * 0.6 - this.camera.position.x) * k - bal * f.parallax,
                          this.camera.position.y + (this.centro.y - this.camera.position.y) * k, f.z);
    }
  }

  projetar(x, y) {
    const v = new THREE.Vector3(x, -y, 0).project(this.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }

  // ---------- efeitos ----------
  efeito(ev) {
    if (!this.fase) return;
    const p = ev.id ? this.pers.find(q => q.id === ev.id) : null;
    if (ev.e === 'bandeira' || ev.e === 'peca') {
      const cor = ev.e === 'bandeira' ? ev.cor : 'amarelo';
      this.explosao(ev.x, ev.y, ev.e === 'peca' ? ['bloquinho_azul', 'bloquinho_rosa', 'bloquinho_amarelo', 'bloquinho_verde'] : [`brilho_${cor}`, 'estrelinha', 'brilho_branco'],
                    ev.e === 'peca' ? 6 : 16, ev.e === 'peca' ? 2.2 : 3.5, ev.e === 'peca' ? 0.22 : 0.32);
    } else if (ev.e === 'morte') {
      this.explosao(ev.x, ev.y - 0.8, ['bloquinho_azul', 'bloquinho_rosa', 'bloquinho_amarelo', 'bloquinho_verde', 'faisca'], 26, 6);
      this.tremor = 1;
    } else if (ev.e === 'renasceu') {
      this.explosao(ev.x, ev.y - 1, [`brilho_${PERS_COR[ev.id]}`, 'estrelinha'], 16, 3);
    } else if (ev.e === 'vitoria') {
      for (const q of this.pers) this.explosao(q.x, q.y - 1.5, ['bloquinho_azul', 'bloquinho_rosa', 'bloquinho_amarelo', 'bloquinho_verde', 'estrelinha'], 30, 7);
    } else if (ev.e === 'pouso' && p) {
      this.explosao(p.x, p.y - 0.1, ['poeira'], 5, 1.5, 0.35);
    } else if (ev.e === 'portal' && p) {
      this.explosao(p.x, p.y - 1, [`brilho_${PERS_COR[p.id]}`], 12, 2.5);
    }
  }

  explosao(x, y, nomes, n, forca, tamanho = 0.32) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(`/assets/particulas/${nomes[i % nomes.length]}.png`), transparent: true, depthWrite: false, toneMapped: false }));
      const tam = tamanho * (0.6 + Math.random() * 0.8);
      s.scale.set(tam, tam, 1);
      s.position.set(x, -y, 0.6);
      s.renderOrder = 20;
      const a = Math.random() * Math.PI * 2;
      const v = forca * (0.4 + Math.random() * 0.6);
      this.grupo.add(s);
      this.particulas.push({ s, vx: Math.cos(a) * v, vy: Math.abs(Math.sin(a)) * v + forca * 0.3, vida: 0.8 + Math.random() * 0.6, giro: (Math.random() - 0.5) * 8 });
    }
  }

  atualizarParticulas(dt) {
    this.particulas = this.particulas.filter(p => {
      p.vida -= dt;
      if (p.vida <= 0) { this.grupo.remove(p.s); p.s.material.dispose(); return false; }
      p.vy -= 12 * dt;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.material.rotation += p.giro * dt;
      p.s.material.opacity = Math.min(1, p.vida / 0.4);
      return true;
    });
  }
}

// Desfoca (bias de mipmap), clareia com névoa de céu e tira um pouco da saturação do fundo pintado.
function afastar(mat, { desfoque, nevoa, cinza }) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uNevoa = { value: new THREE.Color('#EAF3FA') };
    sh.fragmentShader = 'uniform vec3 uNevoa;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec4 amostra = texture2D(map, vMapUv, ${desfoque.toFixed(2)});
      float lum = dot(amostra.rgb, vec3(0.299, 0.587, 0.114));
      amostra.rgb = mix(amostra.rgb, vec3(lum), ${cinza.toFixed(2)});
      amostra.rgb = mix(amostra.rgb, uNevoa, ${nevoa.toFixed(2)});
      diffuseColor *= amostra;`);
  };
  mat.customProgramCacheKey = () => `afastar${desfoque}${nevoa}${cinza}`;
}

function instanciado(geo, mat, itens) {
  const m = new THREE.InstancedMesh(geo, mat, itens.length);
  const o = new THREE.Object3D();
  itens.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z ?? 0);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    m.setColorAt(i, it.cor);
  });
  return m;
}

// Luz suave dentro do arco de chegada: degradê de baixo para cima, acende quando o time chega.
function materialChegada(cor) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { tempo: { value: 0 }, brilho: { value: 0 }, cor: { value: new THREE.Color(cor) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float tempo; uniform float brilho; uniform vec3 cor; varying vec2 vUv;
      void main(){
        float a = (1.0 - vUv.y) * (0.25 + 0.55 * brilho) + 0.05 * sin(tempo * 3.0 + vUv.y * 8.0) * brilho;
        gl_FragColor = vec4(mix(cor, vec3(1.0), 0.35 + 0.3 * brilho), a);
      }`,
  });
}

// Placa de perigo (raio amarelo num círculo marinho), desenhada em canvas.
function texturaAviso() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1E2A4A';
  g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#F6BB33';
  g.beginPath(); g.moveTo(72, 18); g.lineTo(38, 70); g.lineTo(62, 70); g.lineTo(52, 110); g.lineTo(90, 52); g.lineTo(66, 52); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
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

// Anel branco (a cor vem do material) com brilho suave para fora.
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
