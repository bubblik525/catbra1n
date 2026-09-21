"""Tiny fixed-connectivity reservoir + trained logistic readout. Standard library only.
Target: next available hourly-record close below first record close, NOT a fixed horizon.
Chronological token split. Missing records excluded and reported. Research prototype.
"""
import json, math, random, hashlib, xml.etree.ElementTree as ET
from pathlib import Path
P=Path(__file__).resolve().parent
ns={'g':'http://graphml.graphdrawing.org/xmlns'}
g=ET.parse(P/'cat-cortex.graphml').getroot()
nodes=[n.attrib['id'] for n in g.findall('.//g:node',ns)]
idx={n:i for i,n in enumerate(nodes)}
edges=[[idx[e.attrib['source']],idx[e.attrib['target']]] for e in g.findall('.//g:edge',ns)]
assert len(nodes)==65 and len(edges)==1139
rng=random.Random(17)
weights=[[rng.uniform(-.8,.8) for _ in range(5)] for i in nodes]
incoming=[[] for _ in nodes]
for a,b in edges:incoming[b].append(a)
def reservoir(x):
 h=[0.]*65
 for _ in range(8):
  h=[math.tanh(sum(w*v for w,v in zip(weights[i],x))+.65*sum(h[j] for j in incoming[i])/max(1,len(incoming[i]))) for i in range(65)]
 return h
raw=json.loads((P.parents[1]/'companion/research-fixtures.json').read_text())
groups={}
for row in raw:groups.setdefault(row['Token']['Address'],[]).append(row)
examples=[]
for token,rows in groups.items():
 rows.sort(key=lambda r:r['Block']['Time'])
 if len(rows)<2:continue
 a,b=rows[:2]; o=a['Price']['Ohlc']; nxt=b['Price']['Ohlc']['Close']
 if not all(isinstance(o[k],(int,float)) and o[k]>0 for k in ['Open','High','Low','Close']) or not nxt or nxt<=0:continue
 clip=lambda v:max(-1,min(1,v))
 x=[clip(math.log(o['Close']/o['Open'])),clip(math.log(o['High']/o['Low'])),clip(math.log1p(max(0,a['Volume']['Usd'] or 0))/12),clip((o['Close']-o['Low'])/max(1e-15,o['High']-o['Low'])*2-1),clip(math.log(o['Close']/o['High']))]
 examples.append({'token':token,'symbol':a['Token']['Symbol'],'time':a['Block']['Time'],'nextTime':b['Block']['Time'],'features':x,'change':(nxt/o['Close']-1)*100,'label':int(nxt<o['Close']),'h':reservoir(x)})
examples.sort(key=lambda e:(e['time'],e['token']))
cut=int(len(examples)*.7); train,test=examples[:cut],examples[cut:]
w=[0.]*65; bias=0.
def sigmoid(z):return 1/(1+math.exp(-max(-30,min(30,z))))
for epoch in range(180):
 grad=[0.]*65; gb=0.
 for e in train:
  err=sigmoid(bias+sum(a*b for a,b in zip(w,e['h'])))-e['label'];gb+=err
  for i in range(65):grad[i]+=err*e['h'][i]
 for i in range(65):w[i]-=.08*(grad[i]/len(train)+.01*w[i])
 bias-=.08*gb/len(train)
base=sum(e['label'] for e in train)/len(train)
for e in test:e['score']=sigmoid(bias+sum(a*b for a,b in zip(w,e['h'])))
brier=sum((e['score']-e['label'])**2 for e in test)/len(test)
baseline=sum((base-e['label'])**2 for e in test)/len(test)
artifact={'version':1,'nodes':65,'edges':edges,'inputWeights':weights,'readout':w,'bias':bias,'source':'https://neurodata.io/project/connectomes/','doi':'10.1523/JNEUROSCI.1448-13.2013','graphSha256':hashlib.sha256((P/'cat-cortex.graphml').read_bytes()).hexdigest(),'training':{'train':len(train),'test':len(test),'excluded':1000-len(examples),'brier':brier,'baselineBrier':baseline,'beatsBaseline':brier<baseline,'target':'Next available record closes lower; variable horizon','split':'70/30 chronological split by first record; one example per token','limitations':'One-day sample. Selective price coverage. Not calibrated. No fixed-horizon forecast. Synthetic dynamics on published area connectivity; not biological neurons.'},'examples':[{k:v for k,v in e.items() if k!='h'} for e in test]}
(P/'model-validation.json').write_text(json.dumps(artifact['training'],indent=2))
(P.parent.parent/'companion/cortex-data.mjs').write_text('export default '+json.dumps(artifact,separators=(',',':'))+';\n')
print(json.dumps(artifact['training'],indent=2))
