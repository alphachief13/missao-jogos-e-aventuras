"""Persist a stage only after its previews were opened and visually inspected."""
import argparse
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'
p=argparse.ArgumentParser();p.add_argument('stage');p.add_argument('--calls',type=int,required=True);p.add_argument('--images',type=int);p.add_argument('--note',default='');p.add_argument('--review',nargs='*',default=[]);a=p.parse_args()
path=A/'_log/etapas.json';stages=json.loads(path.read_text())
stages[a.stage]=dict(status='conferido',geracoes_ia=a.calls,imagens=a.images,nota=a.note)
path.write_text(json.dumps(stages,ensure_ascii=False,indent=2))
path=A/'_log/revisoes.json';reviews=json.loads(path.read_text())
for key in a.review:reviews[key]=dict(status='aceito',nota=a.note)
path.write_text(json.dumps(reviews,ensure_ascii=False,indent=2))
logs=[json.loads(l) for l in (A/'_log/geracoes.jsonl').read_text().splitlines() if l.strip()]
lines=['# Relatório parcial — produção em andamento','',f'Chamadas de IA registradas até este checkpoint: {len(logs)}.','',
       'O usuário aprovou ruivo_idle e autorizou continuar sem novas confirmações. O bruto aprovado permanece preservado.',
       'rembg e openai podem permanecer pendentes por autorização do usuário enquanto a ferramenta nativa entregar alfa real.','']
for stage,data in stages.items():lines.append(f'- {stage}: {data["status"]}; {data.get("geracoes_ia",0)} gerações de IA. {data.get("nota","")}')
lines+=['','Próximas etapas seguem a ordem da seção 5. Não há jogo escrito. Relatório final e manifesto serão produzidos após todas as etapas.']
(A/'RELATORIO.md').write_text('\n'.join(lines)+'\n')
print(f'Checkpoint: {a.stage}; calls so far: {len(logs)}')
