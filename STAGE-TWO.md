# Stage two: reconstruction and scenario research

Implemented: progressive silver/pink point-cloud assembly tied to validated data acquisition and eight propagation steps. Decorative particles are not biological neurons. Reduced motion and pause remain available.

The scenario panel calculates first-to-last observed close return, maximum running-peak close drawdown, and sample standard deviation of consecutive hourly log returns (at least three pairs). Gaps are not treated as hourly returns. All returned candles must pass OHLC/volume validation. These statistics describe the returned window; they are not trained forecasts.

The 90% loss is an explicit stress assumption, applied to the last observed price. It is not a measured base rate, calibrated probability, guaranteed outcome, or fixed-time prediction. First observation is not verified launch time.

Provider research, September 14, 2026:
- Bitquery provides the current app's hourly price-history input. Existing access token/quota rules remain.
- DEX Screener exposes pool liquidity, buys/sells, price changes, pool creation time and optional token imagery: https://docs.dexscreener.com/api/reference . Pool creation is not token launch. Chain/pool coverage needs live verification.
- GoPlus documents Robinhood chain 4663 support in its July 28 changelog: https://docs.gopluslabs.io/changelog/token-security-api . Token-security endpoint: https://docs.gopluslabs.io/reference/tokensecurityusingget_1 . Contract checks do not predict returns. Integration is not yet enabled; holders/permissions remain NOT CHECKED.

No provider has been silently substituted for a forecasting model. The existing trained readout and its chronological holdout metrics remain unchanged. A current-token forecast requires a new consistently sampled training target and independent validation; the current model still scores the first returned record.
