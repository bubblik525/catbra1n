<div align="center">

# CATBRAIN

### A curious mind. A clearer view of the chain.

**Token research · Neural visualization · On-chain evidence**

[Quick start](#quick-start) · [Explore the desks](#four-desks-one-investigation) · [Visual tour](docs/SHOWCASE.md) · [Setup & data sources](docs/SETUP.md)

<img src="docs/media/cover.png" alt="CATBRAIN artwork: four silver particle cats investigating a softly glowing pink brain" width="960">

*Project artwork — an illustration of curiosity, not an anatomical reconstruction.*

</div>

---

CATBRAIN is a desktop research terminal for exploring tokens through market observations, experimental models and source-backed address relationships. It brings a particle brain, mathematical scenarios, an interactive 3D graph and a live radar into one workspace.

Start with a contract. Inspect the observations. Follow the connections. Keep the evidence in view.

| 4 research desks | 65 cortical regions | 1,139 directed links | Mac & Windows |
| :---: | :---: | :---: | :---: |
| One connected workflow | Published regional graph | Fixed model structure | Desktop build targets |

## Four desks. One investigation.

### 01 / Token View

**Watch observations become a model readout.**

Inspect a token's available price history as five features pass through an experimental cortical network. Follow eight propagation steps, inspect the input candle and explore the animated neural topography.

![Token View — saved SONDE observations and experimental cortical readout](docs/media/token-view.png)

*Historical SONDE example. The score is an uncalibrated model output, not a probability of profit or loss.*

### 02 / Scenario Lab

**Change the question. Examine the assumptions.**

Explore observed returns, drawdown and volatility alongside conditional scenarios. The interface connects equations to their inputs and keeps insufficient-data states visible.

![Scenario Lab — mathematical orbit and historical observations](docs/media/scenario-lab.png)

*Historical example. Scenario paths depend on assumptions; they are not guaranteed forecasts.*

### 03 / Token Network

**Turn separate observations into an explorable map.**

Rotate the 3D graph, select nodes and inspect the evidence. Compare historical token patterns or switch to on-chain relationships. Paste a batch of public addresses to investigate available transfers and holder links.

![Token Network — interactive historical pattern atlas](docs/media/token-network.png)

*This capture shows historical pattern similarity. On-chain mode separately displays source-backed relationships; similarity does not prove shared ownership.*

### 04 / Pro Radar

**Find activity worth investigating.**

Follow launches from the tracked factory, inspect token identities, holders and transfers, and add price and liquidity when a market provider has a quote. Filters help surface research candidates even before a token has a quoted price.

![Pro Radar — simulated demonstration of the live observation interface](docs/media/pro-radar.webp)

*Simulated demonstration capture, clearly labeled in the interface. Live mode requires a working provider connection. WATCH and LOOK CLOSER are research filters, not trade instructions.*

## Quick start

Use Node.js 24. From the repository directory:

```sh
npm ci
npm start
```

For an immediate demonstration:

```sh
npm run demo
```

Select **AGAINPAD**, **SONDE** or **PEAMS** to explore a bundled historical analysis. Open **Token Network → Pattern space → Load 250 saved tokens** for a populated graph. Demo radar observations are simulated and labeled accordingly.

Prefer a browser interface?

```sh
npm run web
```

Open the private localhost URL printed by the launcher. Keep that session URL private.

## Connect real observations

| Source | What it supplies | Where to connect |
| --- | --- | --- |
| **Blockscout PRO** | Factory observations, token metadata, holders and transfers on the configured chain | Pro Radar → Connect Blockscout |
| **Bitquery** | Fresh price history for Token View and Scenario Lab | Data connection |
| **DexScreener** | Available market quotes, liquidity and token images | Used by the radar when indexed |
| **Bundled history** | Reproducible saved examples without credentials | Saved-data buttons |

Keys stay in local server memory and must be re-entered after restarting. Missing data remains unknown. An HTTP 402 response requires restoring the provider's credits and reconnecting.

**Current coverage:** the configured factory on Robinhood Chain 4663. Coverage is not universal across chains or token launches.

## Why a cat brain?

The model uses a published graph of **65 cat cortical regions and 1,139 directed connections**, coupled with fixed engineered reservoir dynamics and a trained logistic readout.

The graph gives the experiment its structure. The cat gives the interface its personality. The observations give each investigation its context.

This is **regional connectivity**, not recordings of individual neurons, biological brain emulation or a validated trading predictor. Read the [model provenance and evaluation](docs/SETUP.md#model-provenance) before interpreting scores.

## Built for inspection

- **Visible provenance:** saved history, simulated observations and live sources remain distinguishable.
- **Interactive visuals:** particle fields, selectable graph nodes, orbital views and mathematical context.
- **Independent on-chain research:** missing market quotes do not prevent metadata and transfer investigation.
- **Local credentials:** no API keys are bundled in source, screenshots or installers.
- **Read-only workflow:** no wallet signatures or automatic trading.

## Project guide

| Resource | Purpose |
| --- | --- |
| [Setup & operations](docs/SETUP.md) | Installation, provider connections, presentation walkthrough and builds |
| [Visual tour](docs/SHOWCASE.md) | Full-size screenshots and what each view represents |
| [Verification report](docs/QA-2026-09-21.md) | Tested scope and known limitations |
| [Automated checks](https://github.com/bubblik525/catbra1n/actions/workflows/test.yml) | Terminal tests across supported CI platforms |
| [Desktop builds](https://github.com/bubblik525/catbra1n/actions/workflows/desktop.yml) | Manual installer builds and native smoke checks |

```text
companion/   Research interface, visualizations and bundled model
src/         Providers, local server and research logic
research/    Dataset provenance and reproducible model training
desktop/    Electron shell and desktop smoke checks
test/       Automated behavior checks
docs/       Setup, verification and visual walkthrough
```

<details>
<summary><strong>Validation & packaging commands</strong></summary>

```sh
npm test
npm run smoke
npm run pack
```

Platform installers: `npm run dist:mac` or `npm run dist:win` on the appropriate build environment. Builds are unsigned unless signing credentials are configured. See [setup](docs/SETUP.md#validation-and-builds) for platform details.

</details>

---

<div align="center">

**Observe. Connect. Question.**

[Project · @catbra1n](https://x.com/catbra1n) &nbsp; · &nbsp; [CEO · @k1rallik](https://x.com/k1rallik)

*CATBRAIN — stay curious.*

</div>
