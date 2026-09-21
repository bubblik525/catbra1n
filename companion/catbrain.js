import { mountResearch } from './braincat-research.js';
let cleanupResearch=()=>{};
import { INPUTS, HIDDEN, OUTPUTS, WEIGHTS, READOUT, createSession, advance, equity } from './catbrain-model.mjs';
import { morphWeights, metrics, appendTelemetry, particleTargets, smooth } from './catbrain-visuals.mjs';

let session=createSession(), root=null, frame=0, timer=0, paused=false, guard=false, view='specimen', yaw=0;
let points=[], selected=6, imageFailed=false;
let morphMode='auto', reassembleAt=-100, telemetry=[], displayValues=null, resizeObserver=null;
let lastInstrument=0, fpsFrames=0, fpsStart=0, renderedFps=0;
const reduced=()=>document.body.classList.contains('reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const names=[...INPUTS,...HIDDEN,...OUTPUTS];
const positions=[...Array.from({length:6},(_,i)=>[-.82,-.55+i*.22]),...Array.from({length:6},(_,i)=>[-.25+(i%2)*.45,-.43+Math.floor(i/2)*.43]),...Array.from({length:4},(_,i)=>[.82,-.45+i*.3])];
const links=[];
WEIGHTS.forEach((row,j)=>row.forEach((w,i)=>{if(w)links.push([i,j+6,w]);}));
READOUT.forEach((row,j)=>row.forEach((w,i)=>{if(w)links.push([i+6,j+12,w]);}));
function values(){return [...session.neural.input,...session.neural.hidden,...session.neural.output];}
function markup(){return `
<section class="cb" aria-label="Catbrain experimental paper simulator">
  <header class="cb-heading"><div><div class="cb-kicker">BRAIN CAT RESEARCH / EXPERIMENT 001</div><h1>CATBRAIN<span> / </span><em>Inside the instinct.</em></h1><p>A small artificial network. Every signal leaves a trace.</p></div><div class="cb-badge">EXPERIMENTAL<span>RESEARCH + SYNTHETIC LAB</span></div></header>
  <div id="braincat-forecast"></div>
  <div class="cb-toolbar"><div class="cb-live"><i></i><span id="cb-status">SIMULATION RUNNING</span></div><div class="cb-controls"><label>SCENARIO<select id="cb-scenario"><option value="cycle">Trend → reversal</option><option value="thin">Thin liquidity</option><option value="volatile">High volatility</option></select></label><label>INSTINCT<select id="cb-temper"><option value="balanced">Balanced</option><option value="cautious">Cautious</option><option value="curious">Curious</option></select></label><button id="cb-pause">Pause</button><button id="cb-reset" title="Clear this simulated portfolio and restart">Reset run ↺</button></div></div>
  <div class="cb-grid"><section class="cb-stage"><div class="cb-stage-top"><span>01 / SYNTHETIC SPECIMEN<br><b>FELIS · SC—016</b></span><div class="cb-switch"><button data-cb-view="specimen" aria-pressed="true">Point cloud</button><button data-cb-view="network" aria-pressed="false">Connections</button></div></div>
    <div class="cb-morph-controls"><span>FORM</span><button data-cb-morph="auto" aria-pressed="true">Auto cycle</button><button data-cb-morph="cat" aria-pressed="false">Cat</button><button data-cb-morph="brain" aria-pressed="false">Brain cloud</button><button id="cb-reassemble">↻ Reassemble</button></div>
    <canvas id="cb-scene" aria-label="Artistic particles morph between a cat, a brain-shaped cloud, and 16 network clusters. These are not anatomical scans."></canvas>
    <div class="cb-scan-hud"><div><span id="cb-form">CAT / ASSEMBLED</span><b>ARTISTIC GEOMETRY</b></div><div class="cb-scan-track"><i id="cb-morph-progress"></i></div><span id="cb-render-fps">RENDER — FPS</span></div>
    <div class="cb-stage-bottom"><span><b id="cb-particles">PREPARING SCAN</b><br>ARTISTIC PARTICLES ≠ NEURONS</span><span id="cb-tick">T + 0000<br>MODEL V0.1 / LOCAL</span></div>
    <div class="cb-caption"><span>DRAG TO ROTATE</span><span>6 INPUTS → 6 HIDDEN → 4 OUTPUTS</span></div>
  </section><aside class="cb-side"><section class="cb-module"><div class="cb-label">02 / DECISION READOUT</div><div class="cb-decision" id="cb-decision">WAIT<span>NO POSITION</span></div><p id="cb-reason">Waiting for the first sample</p><div id="cb-outputs"></div><small>Activation ≠ probability of profit</small></section><section class="cb-module"><div class="cb-label">03 / SENSORY INPUT</div><div id="cb-inputs"></div></section><section class="cb-module cb-inspector"><div class="cb-label">04 / CONNECTION INSPECTOR</div><div id="cb-nodes" class="cb-nodes">${names.map((n,i)=>`<button data-cb-node="${i}" aria-label="Inspect ${n}" aria-pressed="${i===selected}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div><p id="cb-inspect"></p><small>Light: positive weight · dark: negative</small></section></aside></div>
  <section class="cb-telemetry" aria-label="Calculated model telemetry"><div class="cb-telemetry-title"><span>NEURAL OBSERVATORY</span><small>COMPUTED SIGNALS / NOT BIOLOGICAL MEASUREMENTS</small></div><div class="cb-sensor-grid"><div><span>ACTIVE UNITS &gt; 0.5</span><b id="cb-active">—</b><small>OF 16 ARTIFICIAL UNITS</small></div><div><span>MEAN ACTIVATION</span><b id="cb-mean">—</b><small>NORMALIZED / 0–1</small></div><div><span>ABSOLUTE EDGE DRIVE</span><b id="cb-drive">—</b><small>Σ |WEIGHT × SOURCE|</small></div><div><span>ACTIVITY CHANGE</span><b id="cb-delta">—</b><small>MEAN |Δ| / LAST TICK</small></div></div>
  <div class="cb-instruments"><section><header><span>01 / SIGNAL OSCILLOSCOPE</span><b>ACTIVATION</b></header><canvas id="cb-scope" aria-label="Historical BUY, HOLD and EXIT activations from the computed model"></canvas><footer><span class="cb-mint-key">BUY</span><span class="cb-blue-key">HOLD</span><span class="cb-violet-key">EXIT</span><small>LAST 96 TICKS</small></footer></section><section><header><span>02 / WEIGHTED CONNECTIVITY</span><b>16 × 16</b></header><canvas id="cb-matrix" aria-label="Directed connection matrix colored by signed weight times source activation"></canvas><footer><span>ROW → COLUMN</span><small>49 NONZERO EDGES</small></footer></section><section><header><span>03 / SENSORY FIELD</span><b>6 CHANNELS</b></header><canvas id="cb-field" aria-label="Six-channel radar showing current synthetic inputs"></canvas><footer><span>DEMO INPUTS</span><small>NORMALIZED / 0–1</small></footer></section></div>
  <section class="cb-raster"><header><span>04 / ACTIVITY HISTORY</span><small>ONE ROW PER UNIT · ONE COLUMN PER TICK · BRIGHTNESS = ACTIVATION</small></header><canvas id="cb-raster" aria-label="Heatmap of the last 96 model activation samples for all 16 artificial units"></canvas></section></section>
  <div class="cb-bottom"><section class="cb-chart-panel"><div class="cb-label">05 / DEMO: MISO <span>GENERATED PRICE SERIES · NOT A LISTED TOKEN</span></div><div class="cb-market"><b id="cb-price">$1.0000</b><span id="cb-position">NO OPEN POSITION</span></div><canvas id="cb-chart" aria-label="Generated demo price history"></canvas><div class="cb-chart-key"><i></i> SIMULATED PRICE <span>1 TICK = 1 SIMULATED SECOND</span></div></section><section class="cb-ledger"><div class="cb-label">06 / PAPER PORTFOLIO <span>SESSION ONLY</span></div><div class="cb-stats"><div><span>NET EQUITY</span><b id="cb-equity">$1,000.00</b></div><div><span>REALIZED PNL</span><b id="cb-pnl">$0.00</b></div><div><span>CLOSED</span><b id="cb-trades">00</b></div></div><div id="cb-events" class="cb-events" role="log" aria-label="Simulated decision journal"></div></section></div>
  <footer class="cb-notes"><span>LOCAL COMPUTATION / NO WALLET / NO AI API</span><details><summary>How this model works ↗</summary><p>16 artificial units and ${links.length} nonzero weighted connections. Hand-authored weights; no training and no biological connectome. The point cloud, brain shape, scan sweep and moving particles are artistic visualization, not anatomical reconstruction or neural spikes. Morphing never changes trading decisions. The gauges, history and matrix use computed model activations; FPS measures rendering. All prices are generated by a repeating, deterministic demonstration. Scenario changes and Reset clear this demo portfolio. Nothing is sent to your Paper desk or to a blockchain.</p><p>Virtual entries: $100. Modeled fee + slippage: 0.2% each side. Stop: 4%; target: 10%; trail: 3%; maximum hold: 32 ticks. These are illustrative settings, not recommendations. Equity includes modeled exit costs. Pausing, hiding or leaving this tab freezes simulated time. Reload clears the session.</p></details></footer>
</section>`;}

function sampleImage(){
  if(points.length || imageFailed)return;
  const img=new Image();
  img.onload=()=>{
    const c=document.createElement('canvas');c.width=c.height=210;
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0,210,210);
    const data=ctx.getImageData(0,0,210,210).data;
    let seed=19;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    points=[];
    for(let y=0;y<210;y++)for(let x=0;x<210;x++){
      const l=data[(y*210+x)*4]/255;
      if(l>.1 && rand()<.8){const nx=((x+rand()*.8)/210-.5)*2,ny=((y+rand()*.8)/210-.5)*2;points.push([nx,ny,(rand()-.5)*.19+Math.sqrt(Math.max(0,1-nx*nx-ny*ny))*.15,l,rand()]);}
    }
    points.forEach((p,i)=>p.push(particleTargets(i,p[4],positions)));
    if(root)root.querySelector('#cb-particles').textContent=`${points.length.toLocaleString('en-US')} DISPLAY PARTICLES`;
  };
  img.onerror=()=>{imageFailed=true;if(root)root.querySelector('#cb-particles').textContent='POINT CLOUD UNAVAILABLE · NETWORK ACTIVE';};
  img.src='/catbrain-cat.png';
}
export function setCatbrainGuard(locked){guard=locked;}
export function mountCatbrain(container,api){
  if(root?.isConnected)return;
  container.innerHTML=markup();root=container.querySelector('.cb');
  cleanupResearch=mountResearch(root.querySelector('#braincat-forecast'),api);
  sampleImage();if(points.length)root.querySelector('#cb-particles').textContent=`${points.length.toLocaleString('en-US')} DISPLAY PARTICLES`;
  if(imageFailed)root.querySelector('#cb-particles').textContent='POINT CLOUD UNAVAILABLE · NETWORK ACTIVE';
  root.querySelector('#cb-scenario').value=session.scenario;
  root.querySelector('#cb-temper').value=session.temperament;
  root.querySelector('#cb-pause').onclick=()=>{paused=!paused;update();};
  const reset=(scenario=session.scenario)=>{session=createSession(scenario,session.temperament);telemetry=[];displayValues=values();visualTime=0;reassembleAt=-100;update();};
  root.querySelector('#cb-reset').onclick=()=>reset();
  root.querySelector('#cb-scenario').onchange=e=>reset(e.target.value);
  root.querySelector('#cb-temper').onchange=e=>{session.temperament=e.target.value;update();};
  root.querySelectorAll('[data-cb-view]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.cbView===view));b.onclick=()=>{view=b.dataset.cbView;root.querySelectorAll('[data-cb-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};});
  root.querySelectorAll('[data-cb-node]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.cbNode);update();});
  root.querySelectorAll('[data-cb-morph]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.cbMorph===morphMode));b.onclick=()=>{morphMode=b.dataset.cbMorph;view='specimen';root.querySelectorAll('[data-cb-morph]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));root.querySelectorAll('[data-cb-view]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.cbView===view)));};});
  root.querySelector('#cb-reassemble').onclick=()=>{if(!paused&&!reduced())reassembleAt=visualTime;};
  const canvas=root.querySelector('#cb-scene');let drag=null;
  canvas.onpointerdown=e=>{drag=e.clientX;canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(drag!==null){yaw=Math.max(-.8,Math.min(.8,yaw+(e.clientX-drag)*.004));drag=e.clientX;}};
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  displayValues=values();lastTime=0;fpsFrames=0;fpsStart=0;lastInstrument=0;
  resizeObserver=new ResizeObserver(()=>{drawChart();drawInstruments();});resizeObserver.observe(root);
  update();timer=setInterval(()=>{if(!paused&&!document.hidden){advance(session,{guard});update();}},1000);
  frame=requestAnimationFrame(draw);
}
export function unmountCatbrain(){cleanupResearch();clearInterval(timer);cancelAnimationFrame(frame);resizeObserver?.disconnect();root=null;}
function update(){
  if(!root)return;
  const q=id=>root.querySelector('#cb-'+id);
  q('status').textContent=paused?'SIMULATION PAUSED':'SIMULATION RUNNING';
  q('pause').textContent=paused?'Resume':'Pause';
  q('reassemble').disabled=paused||reduced();
  q('reassemble').title=reduced()?'Motion reduced by your accessibility preference':paused?'Resume to animate reconstruction':'Artistic particle scatter and reconstruction';
  appendTelemetry(telemetry,session.step,values());
  const measured=metrics(values(),links,telemetry.at(-2)?.values);
  q('active').textContent=String(measured.active).padStart(2,'0')+' / 16';
  q('mean').textContent=measured.mean.toFixed(3);
  q('drive').textContent=measured.drive.toFixed(2);
  q('delta').textContent=measured.delta.toFixed(3);
  q('decision').innerHTML=`${session.decision}<span>${session.position?'PAPER POSITION OPEN':'NO POSITION'}</span>`;
  q('decision').dataset.decision=session.decision;q('reason').textContent=session.reason;
  const bars=(labels,vs)=>labels.map((label,i)=>`<div class="cb-bar"><span>${label}</span><div><i style="width:${vs[i]*100}%"></i></div><b>${vs[i].toFixed(2)}</b></div>`).join('');
  q('outputs').innerHTML=bars(OUTPUTS,session.neural.output);q('inputs').innerHTML=bars(INPUTS,session.neural.input);
  q('inspect').textContent=`${String(selected+1).padStart(2,'0')} / ${names[selected]} · ${values()[selected].toFixed(3)} activation · ${links.filter(([a,b])=>a===selected||b===selected).length} connections`;
  root.querySelectorAll('[data-cb-node]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.cbNode)===selected)));
  q('tick').innerHTML=`T + ${String(session.step).padStart(4,'0')}<br>MODEL V0.1 / LOCAL`;
  q('price').textContent='$'+session.price.toFixed(4);
  q('position').textContent=session.position?`ENTRY $${session.position.entry.toFixed(4)} · $100 PAPER`:'NO OPEN POSITION';
  q('equity').textContent='$'+fmt(equity(session));q('pnl').textContent=(session.realized<0?'−$':'$')+fmt(Math.abs(session.realized));q('trades').textContent=String(session.trades).padStart(2,'0');
  q('events').innerHTML=session.events.length?session.events.slice(0,5).map(e=>`<div><time>T+${String(e.step).padStart(3,'0')}</time><b>${e.decision}</b><span>${e.reason}</span></div>`).join(''):'<p class="cb-empty">Waiting for the first signal. All outcomes are simulated.</p>';
  drawChart();drawInstruments();
}
function prepare(canvas){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);return [ctx,rect.width,rect.height];}
let visualTime=0,lastTime=0, geometryMix=[1,0,0];
function draw(now){
  if(!root?.isConnected)return;
  frame=requestAnimationFrame(draw);
  if(document.hidden){lastTime=now;return;}
  if(now-lastTime<33)return;
  const dt=Math.min(now-lastTime,60)/1000,still=reduced();
  if(!paused&&!still)visualTime+=dt;
  lastTime=now;
  const target=morphWeights(visualTime,view==='network'?'network':still&&morphMode==='auto'?'cat':morphMode);
  if(still)geometryMix=target;else if(!paused)geometryMix=geometryMix.map((v,i)=>v+(target[i]-v)*Math.min(1,dt*4));
  if(!paused)displayValues=still?values():displayValues.map((v,i)=>v+(values()[i]-v)*Math.min(1,dt*5));
  if(now-lastInstrument>100){drawInstruments();lastInstrument=now;}
  const canvas=root.querySelector('#cb-scene'),rect=canvas.getBoundingClientRect();
  if(rect.bottom<0||rect.top>innerHeight){fpsFrames=0;fpsStart=now;return;}
  const [ctx,w,h]=prepare(canvas),t=visualTime,scale=Math.min(w*.45,h*.46),cx=w*.5,cy=h*.51;
  if(!fpsStart)fpsStart=now;
  fpsFrames++;if(now-fpsStart>=1000){renderedFps=Math.round(fpsFrames*1000/(now-fpsStart));fpsStart=now;fpsFrames=0;root.querySelector('#cb-render-fps').textContent=`RENDER ${renderedFps} FPS`;}
  const activity=displayValues||values(),[catMix,brainMix,netMix]=geometryMix;
  const since=t-reassembleAt,burst=still?0:since<0||since>5?0:since<1?smooth(since):1-smooth((since-1)/4);
  const maxMix=Math.max(...geometryMix),form=burst>.01?'REASSEMBLING':maxMix<.9?'MORPHING':catMix===maxMix?'CAT / ASSEMBLED':brainMix===maxMix?'BRAIN / ARTISTIC CLOUD':'NETWORK / 16 CLUSTERS';
  root.querySelector('#cb-form').textContent=still?'STATIC / REDUCED MOTION':form;
  root.querySelector('#cb-morph-progress').style.width=(burst>.01?(1-burst)*100:maxMix*100)+'%';
  ctx.strokeStyle='#14282a';ctx.lineWidth=.6;
  for(let i=-5;i<=5;i++){ctx.beginPath();ctx.moveTo(cx+i*w*.06,h*.73);ctx.lineTo(cx+i*w*.18,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,h*.75+i*12);ctx.lineTo(w,h*.75+i*12);ctx.stroke();}
  const angle=yaw+(still?0:Math.sin(t*.19)*(.12+brainMix*.38)),co=Math.cos(angle),si=Math.sin(angle);
  const project=(x,y,z=0)=>[cx+(x*co+z*si)*scale,cy+(y+z*.08)*scale];
  // Orbital guides and a traveling scan plane are illustrative, not sensor measurements.
  for(let orbit=0;orbit<3;orbit++){
    ctx.strokeStyle=`rgba(111,178,159,${.12-orbit*.025})`;ctx.beginPath();
    ctx.ellipse(cx,cy+scale*.64,scale*(.86+orbit*.14),scale*(.12+orbit*.03),-.07,0,Math.PI*2);ctx.stroke();
  }
  const sweep=still?0:Math.sin(t*.5)*.75;
  ctx.fillStyle='#7fc9b507';ctx.fillRect(cx-scale*.97,cy+sweep*scale,scale*1.94,20);
  ctx.strokeStyle='#94dfcb44';ctx.beginPath();ctx.moveTo(cx-scale*.97,cy+sweep*scale);ctx.lineTo(cx+scale*.97,cy+sweep*scale);ctx.stroke();
  if(points.length){
    points.forEach(([x,y,z,l,r,targets],index)=>{
      const a=activity[targets.group];
      const drift=still?0:Math.sin(t*(.6+a*.3)+r*30)*.015*a;
      const nx=x*catMix+targets.brain[0]*brainMix+targets.cluster[0]*netMix+targets.scatter[0]*burst;
      const ny=y*catMix+targets.brain[1]*brainMix+targets.cluster[1]*netMix+targets.scatter[1]*burst+drift;
      const nz=z*catMix+targets.brain[2]*brainMix+targets.cluster[2]*netMix+targets.scatter[2]*burst;
      const [px,py]=project(nx,ny,nz),lit=Math.abs(ny-sweep)<.055;
      ctx.fillStyle=lit?`rgba(169,245,220,${.5+a*.4})`:index%5===0?`rgba(158,167,217,${.22+a*.4})`:`rgba(197,221,227,${.23+l*.45+a*.26})`;
      const size=.65+r*.9+(lit?.4:0);ctx.fillRect(px,py,size,size);
      if(lit&&index%45===0){ctx.fillStyle='#a2ffde16';ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();}
    });
  }
  // Scan frame corners rather than a heavy bounding box.
  ctx.strokeStyle='#91ccba77';const left=cx-scale*.95,top=cy-scale*.94,bw=scale*1.9,bh=scale*1.86;
  for(const [x,y,sx,sy] of [[left,top,1,1],[left+bw,top,-1,1],[left,top+bh,1,-1],[left+bw,top+bh,-1,-1]]){ctx.beginPath();ctx.moveTo(x+sx*18,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*18);ctx.stroke();}
  const nodePos=positions.map(([x,y],i)=>{const s=.68+.32*netMix;return project(x*s,y*s+Math.sin(t*.4+i)*.015*(still?0:brainMix),0);});
  links.forEach(([a,b,weight])=>{
    const highlight=a===selected||b===selected, strength=activity[a]*Math.abs(weight)/2.6,alpha=(highlight?.19:.045)+strength*(highlight?.4:.18);
    const [x1,y1]=nodePos[a],[x2,y2]=nodePos[b];
    ctx.strokeStyle=weight>0?`rgba(126,220,184,${alpha})`:`rgba(174,155,215,${alpha})`;ctx.lineWidth=highlight?1:.55;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    const count=highlight?3:1;
    for(let j=0;j<count;j++){const p=(t*(.17+strength*.15)+a*.17+b*.07+j/count)%1,px=x1+(x2-x1)*p,py=y1+(y2-y1)*p;
      ctx.fillStyle=weight>0?`rgba(175,244,214,${.25+strength*.7})`:`rgba(193,172,239,${.25+strength*.7})`;ctx.beginPath();ctx.arc(px,py,.8+strength,0,Math.PI*2);ctx.fill();
      if(highlight){ctx.fillStyle=weight>0?'#a4eaca10':'#ad93dc10';ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();}}
  });
  nodePos.forEach(([x,y],i)=>{
    ctx.fillStyle=`rgba(121,223,189,${.2+activity[i]*.7})`;ctx.beginPath();ctx.arc(x,y,2+activity[i]*2,0,Math.PI*2);ctx.fill();
    if(i===selected){ctx.strokeStyle='#b0e8d2';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();}
    if(netMix>.8){ctx.font='9px monospace';ctx.fillStyle='#a6bab7';ctx.textAlign='center';ctx.fillText(names[i].toUpperCase(),x,y+21);}
  });
  ctx.textAlign='left';ctx.font='9px monospace';ctx.fillStyle='#637a78';ctx.fillText('ROT / '+angle.toFixed(2),20,h-16);ctx.textAlign='right';ctx.fillText(`${links.length} WEIGHTED CONNECTIONS`,w-20,h-16);
}
function drawInstruments(){
  if(!root)return;
  const a=displayValues||values(),t=visualTime;
  const setup=id=>{const c=root.querySelector('#cb-'+id),r=c.getBoundingClientRect();return r.bottom<0||r.top>innerHeight?null:prepare(c);};
  const grid=(ctx,w,h)=>{ctx.strokeStyle='#1b302a';ctx.lineWidth=.5;for(let x=0;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}};
  let panel=setup('scope');if(panel){const [ctx,w,h]=panel;grid(ctx,w,h);
    [[12,'#a8e6c8'],[14,'#83bcd4'],[15,'#b9a0d9']].forEach(([idx,color])=>{ctx.beginPath();telemetry.forEach((entry,i)=>{const x=8+i/95*(w-16),y=12+(1-entry.values[idx])*(h-24);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.lineWidth=1.5;ctx.strokeStyle=color;ctx.stroke();
      if(telemetry.length){const x=8+(telemetry.length-1)/95*(w-16),y=12+(1-telemetry.at(-1).values[idx])*(h-24);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}});
    ctx.fillStyle='#677e73';ctx.font='8px monospace';ctx.fillText('1.0',3,9);ctx.fillText('0.0',3,h-2);
  }
  panel=setup('matrix');if(panel){const [ctx,w,h]=panel,size=Math.min(w-45,h-12),cell=size/16,ox=(w-size)/2,oy=6;
    for(let row=0;row<16;row++)for(let col=0;col<16;col++){ctx.fillStyle=row===selected||col===selected?'#21362d':'#13221c';ctx.fillRect(ox+col*cell,oy+row*cell,cell-1,cell-1);}
    links.forEach(([from,to,weight])=>{const v=Math.min(1,Math.abs(weight*a[from])/2.6);ctx.fillStyle=weight>0?`rgba(157,234,188,${.12+v*.88})`:`rgba(177,149,224,${.12+v*.88})`;ctx.fillRect(ox+to*cell,oy+from*cell,cell-1,cell-1);});
    ctx.fillStyle='#839a8b';ctx.font='8px monospace';ctx.fillText('01',ox-17,oy+8);ctx.fillText('16',ox-17,oy+size);ctx.strokeStyle='#b8ead880';ctx.strokeRect(ox,oy+selected*cell,size,cell);
  }
  panel=setup('field');if(panel){const [ctx,w,h]=panel,cx=w/2,cy=h/2,r=Math.min(w*.32,h*.36),names=['MOM','VOL','DEP','BUY','RISK','AGE'];
    const xy=(i,d)=>[cx+Math.cos(i*Math.PI/3-Math.PI/2)*d,cy+Math.sin(i*Math.PI/3-Math.PI/2)*d];
    for(let ring=1;ring<=4;ring++){ctx.beginPath();for(let i=0;i<=6;i++){const [x,y]=xy(i,r*ring/4);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle='#294738';ctx.lineWidth=.6;ctx.stroke();}
    names.forEach((name,i)=>{const [x,y]=xy(i,r),[tx,ty]=xy(i,r+14);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#94b0a0';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText(name,tx,ty+3);});
    ctx.beginPath();for(let i=0;i<=6;i++){const [x,y]=xy(i,r*a[i%6]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.fillStyle='#9fe6c41c';ctx.fill();ctx.strokeStyle='#a8dec2';ctx.lineWidth=1.5;ctx.stroke();
    for(let i=0;i<6;i++){const [x,y]=xy(i,r*a[i]);ctx.fillStyle='#bcf4d4';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}
  }
  panel=setup('raster');if(panel){const [ctx,w,h]=panel,left=43,cw=(w-left)/96,rh=h/16;
    ctx.fillStyle='#607f6c';ctx.font='8px monospace';for(let i=0;i<16;i++){ctx.fillText(String(i+1).padStart(2,'0'),4,i*rh+rh*.8);if(i===selected){ctx.fillStyle='#a7e9ca0b';ctx.fillRect(left,i*rh,w-left,rh);ctx.fillStyle='#607f6c';}}
    telemetry.forEach((entry,col)=>entry.values.forEach((v,row)=>{ctx.fillStyle=row<6?`rgba(126,182,208,${v*.85})`:row<12?`rgba(161,223,183,${v*.85})`:`rgba(182,153,218,${v*.85})`;ctx.fillRect(left+col*cw,row*rh,Math.max(1,cw-1),Math.max(1,rh-2));}));
  }
}
function drawChart(){if(!root)return;const [ctx,w,h]=prepare(root.querySelector('#cb-chart'));const vals=session.history.map(x=>x.price);ctx.strokeStyle='#162725';ctx.lineWidth=1;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,i*h/4);ctx.lineTo(w,i*h/4);ctx.stroke();}if(vals.length<2)return;const min=Math.min(...vals)*.997,max=Math.max(...vals)*1.003;ctx.beginPath();vals.forEach((v,i)=>{const x=i/(vals.length-1)*w,y=h-8-(v-min)/(max-min)*(h-16);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle='#9fcbb9';ctx.lineWidth=1.5;ctx.stroke();}
