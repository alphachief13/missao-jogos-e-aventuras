// Servidor local só de arquivos (para testar sem o GitHub Pages). A partida roda no navegador da tela.
// Mesma estrutura do site publicado: public/ na raiz, assets/ e vendor/ (bibliotecas de node_modules).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORTA || 8090);

export const PASTAS = [
  ['/assets/', path.join(RAIZ, 'assets')],
  ['/vendor/three/', path.join(RAIZ, 'node_modules/three')],
  ['/vendor/peerjs/', path.join(RAIZ, 'node_modules/peerjs/dist')],
  ['/vendor/qrcode/', path.join(RAIZ, 'node_modules/qrcode-generator')],
  ['/', path.join(RAIZ, 'public')],
];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
                '.png': 'image/png', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const [prefixo, pasta] of PASTAS) {
    if (!url.startsWith(prefixo)) continue;
    let arq = path.join(pasta, url.slice(prefixo.length));
    if (!arq.startsWith(pasta)) break; // bloqueia ../
    if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
    if (!fs.existsSync(arq)) continue;
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    return fs.createReadStream(arq).pipe(res);
  }
  res.writeHead(404).end('não encontrado');
}).listen(PORTA, '0.0.0.0', () => {
  console.log(`\n  MISSÃO, JOGOS E AVENTURAS: abra http://localhost:${PORTA}/ (celulares entram pelo QR code da tela)\n`);
});
