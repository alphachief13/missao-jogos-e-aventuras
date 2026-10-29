"""Archive replaced inputs, then register the image through the existing adapter."""
from pathlib import Path
import subprocess,sys,shutil
ROOT=Path(__file__).resolve().parents[1]
key,source=sys.argv[1:3]
for old in [ROOT/f'assets/_bruto/{key}.png',ROOT/f'assets/_bruto/{key}.png.prompt.txt',ROOT/f'assets/_bruto/native/{key}.png']:
    if old.exists():
        dest=ROOT/'assets/_bruto/_arquivo_missao_gamer'/old.relative_to(ROOT/'assets/_bruto')
        dest.parent.mkdir(parents=True,exist_ok=True)
        if not dest.exists():shutil.copy2(old,dest)
subprocess.run([sys.executable,str(ROOT/'tools/accept_native.py'),key,source,'--force'],cwd=ROOT,check=True)
