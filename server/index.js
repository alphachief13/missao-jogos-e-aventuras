// Servidor da rede local: entrega o jogo (HTTP) e roda a partida (WebSocket).
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';
import { Sala } from './sala.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA || 8090);

// /assets → assets/, /vendor/three → node_modules/three, o resto → public/
const PASTAS = [
  ['/assets/', path.join(RAIZ, 'assets')],
  ['/vendor/three/', path.join(RAIZ, 'node_modules/three')],
  ['/', path.join(RAIZ, 'public')],
];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
                '.png': 'image/png', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };

function ipLocal() {
  // Prefere a interface de rede real (Wi-Fi/cabo) e ignora docker/bridges virtuais.
  const lista = Object.entries(os.networkInterfaces())
    .filter(([nome]) => !/^(docker|br-|veth|virbr|lo)/.test(nome))
    .flatMap(([, addrs]) => addrs)
    .filter(a => a.family === 'IPv4' && !a.internal);
  return (lista.find(a => /^192\.168\./.test(a.address)) || lista.find(a => /^10\./.test(a.address)) || lista[0])?.address || 'localhost';
}

const IP = ipLocal();
const URL_CONTROLE = `http://${IP}:${PORTA}/controle.html`;
const URL_TELA = `http://${IP}:${PORTA}/`;

const servidor = http.createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/info.json') {
    const qr = await QRCode.toDataURL(URL_CONTROLE, { margin: 1, width: 360, color: { dark: '#1E2A4A', light: '#FFFFFF' } });
    res.writeHead(200, { 'content-type': TIPOS['.json'], 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ urlControle: URL_CONTROLE, urlTela: URL_TELA, qr }));
  }
  for (const [prefixo, pasta] of PASTAS) {
    if (!url.startsWith(prefixo)) continue;
    let arq = path.join(pasta, url.slice(prefixo.length));
    if (!arq.startsWith(pasta)) break; // bloqueia ../
    if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
    if (!fs.existsSync(arq)) continue;
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream',
                         'cache-control': prefixo === '/' ? 'no-cache' : 'max-age=3600' });
    return fs.createReadStream(arq).pipe(res);
  }
  res.writeHead(404).end('não encontrado');
});

const sala = new Sala();
new WebSocketServer({ server: servidor, path: '/ws' }).on('connection', ws => sala.conectar(ws));

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log('\n  MISSÃO, JOGOS E AVENTURAS rodando!\n');
  console.log(`  Tela do jogo (este PC):  http://localhost:${PORTA}/`);
  console.log(`  Outros PCs na rede:      ${URL_TELA}`);
  console.log(`  Celulares (controle):    ${URL_CONTROLE}\n`);
});
