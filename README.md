# Cat Brain

Private source repository for the local Cat Brain research terminal.

Four desks: Token View (experimental cortical readout), Scenario Lab (observed metrics and conditional paths), Token Network (3D patterns and source-backed address relationships), and Pro Radar (live observation).

## Run locally

Node.js 24 recommended.

```sh
npm ci
npm start
```

For the browser UI without installing Electron:

```sh
node bin/companion.mjs
```

Open the private localhost URL printed by the launcher. For simulated radar data use `npm run demo` or `node bin/companion.mjs --demo`. The desktop File menu switches between demo and live mode.

## Data connections

- In **04 Pro Radar**, enter a Blockscout PRO API key and select **Connect Blockscout**. This provides factory observations and address relationships on Robinhood Chain 4663.
- In **03 Token Network**, paste up to 50 public addresses and select **Trace addresses**. The current sample is capped at 50 transfers and 30 holders per request, with a 600-node / 2,000-link graph cap. A transfer is not proof of common ownership.
- For fresh price history in desks 1–2, enter a separate **Bitquery** access token in **Data connection**. Blockscout credentials do not authenticate Bitquery.
- Saved historical examples work without credentials. They are bundled public market observations, not current quotes or personal wallet exports.
- Radar quotes use DexScreener. Newly observed launches may have no indexed market quotes; missing market values remain unknown. Tokens can still be ranked for on-chain research from fresh metadata, holders and transfers without a price quote.

Keys remain in local server memory and must be entered again after restart. Do not commit keys, personal address lists, profiles, investigation exports, or logs. Local data stays outside the source tree by default.

## Validation and builds

```sh
npm test
python3 test/pty_smoke.py
npm run smoke
npm run pack
```

`npm run smoke` uses an isolated temporary profile, opens a native window, runs a saved model example and switches all four desks. Building does not publish releases. CI checks run without account credentials; desktop installers are built only by manual workflow or version tags, with publishing disabled.

Desktop builds provide separate installers for Windows x64, Mac Apple Silicon (arm64), and Mac Intel (x64). Each packaged application is launched on its native CI runner. Windows CI also installs into a path containing spaces and Cyrillic characters and launches the installed executable. Node.js is bundled in the desktop application; end users do not need to install it.

Private installer downloads are available under GitHub **Actions → Desktop builds → Artifacts** to users with repository access. Artifacts expire after seven days; rerun the workflow to rebuild them. These builds are unsigned and not notarized, so Windows SmartScreen or macOS Gatekeeper can display a trust prompt. Public distribution without such prompts requires platform signing credentials.

See [QA report](docs/QA-2026-09-21.md) for tested scope and remaining limitations.

## Model provenance

The model uses a published graph of 65 cat cortical regions and 1,139 directed links, fixed engineered reservoir dynamics and a trained logistic readout. It is not a biological brain simulation or a validated trading predictor. Scores are uncalibrated. Conditional paths assume fixed drift and diffusion and are not calibrated prediction intervals.

The bundled training sample has 227 training examples, 98 chronological holdout examples and 675 exclusions for insufficient history. One-day coverage does not establish trading performance.

Graph source: https://neurodata.io/project/connectomes/

To reproduce the bundled artifact using Python's standard library:

```sh
python3 research/pons-history/train_catbrain.py
```

This reads the public fixture and graph and rewrites `companion/cortex-data.mjs` and the validation report. The independently reproduced artifact was byte-identical during QA.

Vendored 3D rendering: `companion/vendor/3d-force-graph.min.js`, with upstream license alongside it.

## Ready-to-show session

1. Start the desktop application with `npm start` (Mac or Windows).
2. In Token View, select one of the bundled **AGAINPAD**, **SONDE** or **PEAMS** saved historical examples. The model computes from actual saved observations; these are not live quotes. Scenario Lab uses the same selected token.
3. In Pro Radar, connect your own Blockscout PRO key. It remains in server memory and is not saved to GitHub or the profile. Reconnect after restarting.
4. In Token Network, choose **On-chain evidence**, paste public contract/wallet addresses for Robinhood Chain 4663, then **Trace addresses**. The resulting links represent loaded source evidence, not proof of shared ownership. Use **Pattern space → Load 250 saved tokens** for a historical pattern visualization; pattern similarity is not an on-chain transfer.
5. In Pro Radar, enable **With data** to hide unresolved entries. **Interesting only** narrows to market WATCH or on-chain LOOK CLOSER findings; neither is a buy recommendation. Click a token and load its on-chain details.

**Credentials:** Blockscout supplies on-chain observations; fresh price history in Token View / Scenario Lab requires a separate Bitquery token. A Blockscout key cannot replace it. Do not paste credentials into source files, README, issues or commits.

### Radar behavior

- Metadata, holders and transfers load independently of quotes.
- Logos use provider HTTPS images with initials as a fallback. A missing logo is not replaced with a fabricated token image.
- Display time updates every second; provider fetches have separate intervals, caching and backoff. Check last-scan and quote timestamps for freshness.
- HTTP 401/402/403 blocks repeated authenticated polling until reconnect. Market quote fetching can continue independently.
- Tracking covers the configured factory on chain 4663, not every token on every chain.

### Latest verification — 2026-09-21

78 automated tests passed on macOS. The packaged Mac application was opened with live Blockscout data, current scan progress, provider token images and populated source-backed relationships. Missing data stays explicitly unknown. Windows builds and tests have dedicated GitHub Actions workflows; local Mac testing does not establish Windows GUI compatibility.
