// Hand-authored toy network. No training, biological data, or market predictions.
export const INPUTS = ['Momentum', 'Volume', 'Depth', 'Buy pressure', 'Volatility', 'Maturity'];
export const HIDDEN = ['Impulse', 'Participation', 'Stability', 'Pressure', 'Caution', 'Readiness'];
export const OUTPUTS = ['BUY', 'WAIT', 'HOLD', 'EXIT'];
export const WEIGHTS = [
  [2.2, .5, 0, 1, -.6, 0], [.3, 2, .5, .5, 0, 0],
  [0, 0, 2, 0, -1.8, .5], [1, .2, 0, 2.2, -.3, 0],
  [-1, 0, -1.5, -1, 2.6, -.5], [.8, .6, 1, .8, -.8, .5],
];
export const READOUT = [[1.5,.5,1,1,-2,1],[-1,-.3,-.5,-1,1.5,-.5],[.7,.3,1,.5,-1,.5],[-1,0,-.5,-1,2,-.5]];
const sigmoid = x => 1 / (1 + Math.exp(-x));
const clamp = x => Math.max(0, Math.min(1, x));
const dot = (a,b) => a.reduce((s,w,i) => s + w*b[i], 0);
export function evaluate(input) {
  if (input.length !== 6 || input.some(x => !Number.isFinite(x))) throw Error('Six finite inputs required');
  const values = input.map(clamp);
  const hidden = WEIGHTS.map(row => sigmoid(dot(row, values) - 1.2));
  const output = READOUT.map((row,i) => sigmoid(dot(row,hidden) - [1.1,-.5,.7,0][i]));
  return { input: values, hidden, output };
}
export function createSession(scenario = 'cycle', temperament = 'balanced') {
  return { scenario, temperament, step:0, price:1, cash:1000, position:null, realized:0,
    trades:0, decision:'WAIT', reason:'Waiting for the first sample', history:[], events:[], neural:evaluate([.5,.4,.7,.5,.2,.6]) };
}
export function sample(step, scenario) {
  const phase = step % 64;
  const rising = phase >= 8 && phase < 34;
  const falling = phase >= 34 && phase < 49;
  const momentum = rising ? .86 : falling ? .12 : .47;
  return { delta: (rising ? .007 : falling ? -.009 : .0001) + Math.sin(step*.8)*.0015,
    input: [momentum, rising||falling ? .83 : .32, scenario==='thin' ? .1 : .82,
      rising ? .84 : falling ? .16 : .48, scenario==='volatile' ? .94 : falling ? .75 : .2, .72] };
}
const COST = .002; // Modeled combined fee/slippage per side, not a market quote.
export function equity(s) { return s.cash + (s.position ? s.position.quantity * s.price * (1-COST) : 0); }
export function advance(s, {guard=false}={}) {
  const data = sample(s.step++, s.scenario);
  s.price *= 1 + data.delta;
  s.neural = evaluate(data.input);
  const [buy,,,exit] = s.neural.output;
  const threshold = {cautious:.94, balanced:.91, curious:.84}[s.temperament] ?? .91;
  const previous = s.decision;
  if (s.position) {
    const p = s.position;
    p.peak = Math.max(p.peak,s.price);
    const change = s.price/p.entry-1;
    const reason = change <= -.04 ? 'Stop-loss · −4%' : change >= .10 ? 'Target · +10%' :
      s.price/p.peak-1 <= -.03 ? 'Trailing stop · 3%' : s.step-p.opened >= 32 ? 'Maximum hold · 32 ticks' :
      exit > .32 ? 'Exit activation crossed threshold' : '';
    if (reason) {
      const proceeds = p.quantity*s.price*(1-COST);
      s.cash += proceeds;
      s.realized += proceeds-p.cost;
      s.position = null;
      s.trades++;
      s.decision='EXIT'; s.reason=reason;
    } else { s.decision='HOLD'; s.reason='Position open · protection active'; }
  } else if (guard) { s.decision='VETO'; s.reason='Session guard · new entries paused'; }
  else if (data.input[2]<.25) { s.decision='VETO'; s.reason='Depth below demo safety floor'; }
  else if (data.input[4]>.9) { s.decision='VETO'; s.reason='Volatility above demo safety ceiling'; }
  else if (buy>threshold && s.cash>=100) {
    s.position={entry:s.price, peak:s.price, quantity:100/(s.price*(1+COST)), cost:100, opened:s.step};
    s.cash-=100; s.decision='BUY'; s.reason='Entry activation crossed threshold · paper only';
  } else { s.decision='WAIT'; s.reason='Entry activation below threshold'; }
  s.history.push({price:s.price, buy, exit, equity:equity(s)});
  if (s.history.length>100) s.history.shift();
  if (s.decision!==previous || s.step===1) {
    s.events.unshift({step:s.step, decision:s.decision, reason:s.reason, price:s.price});
    s.events=s.events.slice(0,30);
  }
  return s;
}
