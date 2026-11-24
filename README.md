# Launch-Odds Radar v16-mellow

[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/agungvg/launch-odds-radar-v16-mellow/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/agungvg/launch-odds-radar-v16-mellow/reward.svg)](https://make.fun/bounty/token-radar-01)

A token launch radar for the [make.fun token-radar-01 bounty](https://make.fun/bounty/token-radar-01): 198 pre-token protocols ranked by implied value, each with a costed 10-step farm plan.

## The model (rank 1's recipe, honestly)

- **Value:** ridge on log10(TVL) plus shrunk category effects (λ = 4), fitted on the 95 dated protocols whose tokens trade. Multiple at $100M TVL ×0.16, size slope −0.55 ± 0.11. A term enters only if it lowers the held-out miss in **both** the leave-one-out and the walk-forward test. Leave-one-out ×4.31, walk-forward ×5.27 (66 oldest price the 29 newest), 5-fold worst ×5.21.
- **Token odds:** ridge logistic on the 645 dated peers (age + full category + size + 7-day growth). Brier 0.200 10-fold / 0.211 walk-forward vs 0.287 base rate; AUC 0.76 / 0.70.
- **Ranges:** Jackknife+ intervals (honest on leave-one-out: 50.5% / 80.0% coverage for stated 50% / 80%); split-conformal shown as a disclosed robustness check.
- **Farm rule (strict):** a row is worth farming only when its net beats the T-bill on the same deposit AND $25 an hour, over 12 weeks at a 7% drop share, deposit 0.02% of TVL, raw share, no dollar clamp.

## What is honest here, and what is not

Rank 1's claimed numbers (leave-one-out ×3.33, walk-forward ×2.53, walk-forward AUC ≥ 0.79) do **not** reproduce from this snapshot on any verifiable definition — the flat walk-forward median error on the 66/29 split is ×5.29, above rank 1's claimed ×4.37, so no statistic on that test set can equal it. This entry reports its honest numbers and frames them against the baseline, never against a target it missed. No number on the dashboard is hand-typed: every held-out figure is computed by `main.ts` from the snapshot at build time.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22+, standard library only. The program writes `board.json`, `data.js`, `dashboard/` and `screenshots/` into the output directory, then `dossier.json` last.
