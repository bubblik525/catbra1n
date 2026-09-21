// Artistic image-derived point geometry, not biological neuron recordings.
let stop = () => {};
export function unmountObservatory(){stop();stop=()=>{};}
export function mountObservatory(canvas){
 if(!canvas)return;unmountObservatory();
 const ctx=canvas.getContext('2d');let points=[],frame=0,time=0,last=0,paused=false,burst=-10,dead=false,px=0,py=0;
 const reduced=()=>document.body.classList.contains('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const image=new Image();image.src='/catbrain-cat.png';
 image.onload=()=>{if(dead)return;const sample=document.createElement('canvas');sample.width=sample.height=230;const c=sample.getContext('2d');c.drawImage(image,0,0,230,230);const d=c.getImageData(0,0,230,230).data;for(let y=0;y<230;y++)for(let x=0;x<230;x++){const light=d[(y*230+x)*4]/255;if(light>.14)points.push({x:x/230,y:y/230,l:light,k:(x*37+y*19)%101/101});}};
 const move=e=>{const r=canvas.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;};
 const rebuild=()=>{if(!reduced()){burst=time;paused=false;button.textContent='Pause motion';}};
 canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',()=>{px=py=0;});canvas.addEventListener('click',rebuild);
 const button=document.querySelector('#motion-toggle'),reconstruct=document.querySelector('#reconstruct');
 button.onclick=()=>{paused=!paused;button.textContent=paused?'Resume motion':'Pause motion';};reconstruct.onclick=rebuild;
 function draw(ts){frame=requestAnimationFrame(draw);if(document.hidden){last=ts;return;}const dt=Math.min((ts-last)/1000,.05);last=ts;if(!paused&&!reduced())time+=dt;
 const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
 const size=Math.min(r.width*.96,r.height*1.15),ox=(r.width-size)/2,oy=(r.height-size)/2;const elapsed=time-burst,dis=elapsed>=0&&elapsed<2.5?Math.sin(elapsed/2.5*Math.PI):0;
 const scan=(time*.13)%1;ctx.strokeStyle='#ffffff0b';ctx.lineWidth=1;
 for(let i=0;i<9;i++){const y=r.height*.35+i*r.height*.065;ctx.beginPath();ctx.moveTo(25,y);ctx.lineTo(r.width-25,y);ctx.stroke();}
 ctx.strokeStyle='#d4deed26';ctx.strokeRect(ox+size*.12,oy+size*.16,size*.76,size*.67);
 for(const p of points){const right=Math.max(0,(p.x-.55)*2),shift=dis*right*size*.26;const x=ox+p.x*size+px*(p.y-.5)*18+shift,y=oy+p.y*size+py*(p.x-.5)*12+Math.sin(time*1.5+p.x*8)*1.2;const pulse=Math.max(0,1-Math.abs(p.x-scan)*13);ctx.fillStyle=`rgba(224,231,240,${Math.min(1,(.38+p.l*.65+pulse*.35)*(1-dis*right*.5))})`;ctx.fillRect(x,y,p.l>.65?1.45:1,p.l>.65?1.45:1);}
 if(!points.length&&image.complete&&image.naturalWidth)ctx.drawImage(image,ox,oy,size,size);
 const sx=ox+scan*size;ctx.strokeStyle='#cbd7e72a';ctx.beginPath();ctx.moveTo(sx,50);ctx.lineTo(sx,r.height-60);ctx.stroke();
 ctx.fillStyle='#84909e';ctx.font='9px monospace';ctx.fillText('X / '+scan.toFixed(3),Math.max(15,Math.min(r.width-80,sx)),r.height-68);
 }
 frame=requestAnimationFrame(draw);stop=()=>{dead=true;cancelAnimationFrame(frame);image.onload=null;canvas.removeEventListener('pointermove',move);canvas.removeEventListener('click',rebuild);};
}
