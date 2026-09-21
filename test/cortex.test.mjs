import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../companion/cortex-data.mjs';
import {propagate} from '../companion/cortex-engine.mjs';
test('published connectivity has valid directed endpoints',()=>{assert.equal(data.nodes,65);assert.equal(data.edges.length,1139);assert.equal(new Set(data.edges.map(e=>e.join(':'))).size,1139);assert.ok(data.edges.every(e=>e.every(i=>Number.isInteger(i)&&i>=0&&i<65)));});
test('browser inference agrees with independent Python training output',()=>{for(const e of data.examples){const r=propagate(e.features);assert.ok(Math.abs(r.score-e.score)<1e-12);assert.equal(r.frames.length,9);assert.ok(r.frames.flat().every(Number.isFinite));}assert.throws(()=>propagate([NaN,0,0,0,0]));});
