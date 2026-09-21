import {test} from 'node:test';
import assert from 'node:assert/strict';
import {model,forecast,train} from '../companion/braincat-forecast.mjs';
test('synthetic training is reproducible and reduces training loss',()=>{assert.deepEqual(train(),model);assert.ok(model.loss.at(-1)<model.loss[0]);});
test('risk inputs influence direction; horizons do not fabricate additional model certainty',()=>{assert.equal(forecast(Array(6).fill(0)).direction,'UPSIDE');assert.equal(forecast(Array(6).fill(1)).direction,'DOWNSIDE');assert.equal(forecast(Array(6).fill(.4),24).activation,forecast(Array(6).fill(.4),48).activation);assert.throws(()=>forecast([NaN]));assert.throws(()=>forecast(Array(6).fill(.5),12));});
