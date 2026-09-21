// Display math only. Geometry and morph timing never feed trading decisions.
export const smooth = x => { const t=Math.max(0,Math.min(1,x)); return t*t*(3-2*t); };
export function morphWeights(time, mode='auto') {
  if(mode==='cat')return [1,0,0];
  if(mode==='brain')return [0,1,0];
  if(mode==='network')return [0,0,1];
  const phase=((time%30)+30)%30/10,stage=Math.floor(phase),blend=smooth((phase-stage-.55)/.45);
  const weights=[0,0,0];weights[stage]=1-blend;weights[(stage+1)%3]=blend;return weights;
}
export function metrics(activations, connections, previous=activations) {
  return {
    active:activations.filter(x=>x>.5).length,
    mean:activations.reduce((s,x)=>s+x,0)/activations.length,
    delta:activations.reduce((s,x,i)=>s+Math.abs(x-previous[i]),0)/activations.length,
    drive:connections.reduce((s,[a,,w])=>s+Math.abs(w*activations[a]),0),
  };
}
export function appendTelemetry(history, step, activations) {
  if(history.at(-1)?.step===step)return;
  history.push({step,values:[...activations]});
  if(history.length>96)history.shift();
}
export function particleTargets(index, r, positions) {
  const u=((index*.61803398875)%1),v=((index*.754877666)%1),theta=u*Math.PI*2;
  const cos=1-2*v,sin=Math.sqrt(Math.max(0,1-cos*cos)),side=index%2?1:-1;
  const ridge=1+.065*Math.sin(theta*9+cos*11);
  const brain=[side*.29+Math.cos(theta)*sin*.31*ridge,cos*.56*ridge-.08,Math.sin(theta)*sin*.38*ridge];
  const group=Math.min(15,Math.floor(r*16)),[x,y]=positions[group],radius=.025+((index*.41421356)%1)*.07;
  const cluster=[x+Math.cos(theta)*radius,y+Math.sin(theta)*radius,sin*Math.cos(index)*.11];
  const scatter=[Math.cos(theta)*(.65+v*.4),cos*.9,Math.sin(theta)*(.35+v*.35)];
  return {brain,cluster,scatter,group};
}
