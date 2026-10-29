#!/bin/bash
# Monta o site estático (GitHub Pages) em _site/: public/ na raiz + assets/ + bibliotecas em vendor/.
set -e
cd "$(dirname "$0")/.."
rm -rf _site && mkdir -p _site/vendor/three/build _site/vendor/three/examples/jsm/{geometries,environments} _site/vendor/peerjs _site/vendor/qrcode
cp -r public/. _site/
rsync -a --exclude '_bruto' --exclude '_log' --exclude 'preview' --exclude '*.md' --exclude 'manifest.json' assets/ _site/assets/
cp node_modules/three/build/three.module.js node_modules/three/build/three.core.js _site/vendor/three/build/
cp node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js _site/vendor/three/examples/jsm/geometries/
cp node_modules/three/examples/jsm/environments/RoomEnvironment.js _site/vendor/three/examples/jsm/environments/
cp node_modules/peerjs/dist/peerjs.min.js _site/vendor/peerjs/
cp node_modules/qrcode-generator/qrcode.js _site/vendor/qrcode/
touch _site/.nojekyll
du -sh _site
