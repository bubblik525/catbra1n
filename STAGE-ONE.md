# Cat Brain / Stage 01

Desktop research application for macOS and Windows, built with Electron.

Run from source: `npm install`, then `npm start` in terminal-cli.
Build macOS: `npm run dist:mac`. Build Windows on Windows: `npm run dist:win`.
Local browser preview: `npm run web` and open the private URL it prints.

The new root screen is contract research. Existing multi-tool UI remains at
`/legacy`; it is not part of the Stage 01 flow.

## Data

Use saved examples immediately, with real historical Bitquery exports.
For another contract, choose Data connection and enter a Bitquery access token
with Trading API permission. Browser sign-in does not authorize this app.
Credentials stay in local server memory and are only transmitted to Bitquery.
No wallet, registration in Cat Brain, or token ownership is required.

One request at a time, minimum 15-second interval, 60-second per-token cache,
60-second cooldown after HTTP 429. No background polling.

## Model and meaning

65 published cortical areas and 1,139 directed connections; synthetic input
weights and dynamics; logistic readout trained on 227 first-candle examples.
98 held-out examples, single day of Pons launches. Inputs match the trainer:
log close/open, log high/low, log volume, close position, log close/high.

The score refers to the FIRST returned hourly record and direction of the next
available record. It is not a current/fixed-horizon prediction. Older inputs
and incomplete history are explicitly disclosed. Not calibrated, not a safety
rating, not a demonstrated trading edge. No live API credential was available
for an end-to-end external API test in this implementation session.

Price, volume, input timing, input return/drawdown, feature values, intermediate
activations and model output are displayed. Contract security, holders and
creator checks are explicitly NOT CHECKED. No token logo provider is connected;
letters are used as a placeholder. The supplied cat is used only as brand avatar.

Rendering: Canvas point cloud inspired by reconstruction visuals; decorative
particles and arbitrary coordinates are not anatomical data. 65 activation
nodes use actual model values. Pause motion and reduced-motion supported.

Tests: node --test test/*.test.mjs. Build artifacts are unsigned unless signing
credentials are configured. Do not publish research datasets until their
redistribution terms have been reviewed.
