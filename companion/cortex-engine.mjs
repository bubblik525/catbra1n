import data from './cortex-data.mjs';
export function propagate(input, steps=8){
 if(input.length!==5||input.some(v=>!Number.isFinite(v)))throw Error('Five finite features required');
 const incoming=Array.from({length:65},()=>[]);data.edges.forEach(([a,b])=>incoming[b].push(a));
 let h=Array(65).fill(0);const frames=[h];
 for(let k=0;k<steps;k++){h=h.map((_,i)=>Math.tanh(data.inputWeights[i].reduce((s,w,j)=>s+w*input[j],0)+.65*incoming[i].reduce((s,j)=>s+h[j],0)/Math.max(1,incoming[i].length)));frames.push(h);}
 const score=1/(1+Math.exp(-(data.bias+h.reduce((s,v,i)=>s+v*data.readout[i],0))));return {frames,score};
}
