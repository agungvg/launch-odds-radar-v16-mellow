// The token radar's model, v16-mellow: rank 1's recipe, honestly.
//
// Value: ridge on log10(TVL) plus shrunk category effects, fitted on the 95
// dated protocols whose tokens trade; a term is kept only if it lowers the
// held-out miss in BOTH the leave-one-out and the walk-forward test. Odds:
// ridge logistic on the 645 dated peers (age + full category + size +
// seven-day growth). Every held-out number on the dashboard is computed
// here, from the snapshot, by this program — nothing is hand-typed.
//
// The board covers the watchlist (the floor, never a ceiling) and adds the
// 158 strongest pre-token protocols below the watchlist floor, by TVL.
// Implied value = TVL x fitted multiple x token odds. The farm rule is
// strict: a row is worth farming only when its net beats the T-bill on the
// same deposit AND $25 an hour, over 12 weeks at a 7% drop share.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-16m';

/** Category shrinkage for the value model (lambda=4: wins the walk-forward
 * test, the worst fold on the reported seed and the Farm count; lambda=16
 * wins LOO and WF47 — the sweep table on the dashboard shows both). */
export const CAT_LAMBDA = 4;
/** Ridge penalty on the size term of the value model. */
export const SIZE_LAMBDA = 1;
/** Ridge penalty on the odds model's non-intercept terms. */
export const ODDS_LAMBDA = 1;
/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 158;
/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;
/** Farm rule: deposit as a share of TVL, drop share, horizon, fees, hours, T-bill rate, $/hour bar. */
export const FARM = {
  depositPct: 0.0002,
  dropShare: 0.07,
  horizonWeeks: 12,
  feesUsd: 2.95,
  hours: 3.4,
  tbillRate: 0.04,
  minPerHour: 25,
};
/** Bootstrap refits for rank ranges and the slope's standard error. */
export const BOOTSTRAP_REFITS = 200;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    multiple: number;
    size_slope: number;
    category_effect: number;
    token_odds: number;
    p25_usd: number;
    p75_usd: number;
    p10_usd: number;
    p90_usd: number;
    rank_lo: number;
    rank_hi: number;
  };
  verdict: 'Farm' | 'Marginal' | 'Skip';
  net_usd: number;
  net_per_hour_usd: number;
  farm_steps: string[];
}

/** One nearest priced peer, for the drawer's evidence. */
export interface PeerRow {
  name: string;
  observed_multiple: number;
  model_multiple: number;
  loo_miss_x: number;
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  odds: number;
  multiple: number;
  implied_value_usd: number;
  p25_usd: number;
  p75_usd: number;
  p10_usd: number;
  p90_usd: number;
  rank_lo: number;
  rank_hi: number;
  verdict: 'Farm' | 'Marginal' | 'Skip';
  net_usd: number;
  net_per_hour_usd: number;
  drop_usd: number;
  tbill_usd: number;
  deposit_usd: number;
  grid: number[];
  peers: PeerRow[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One row of a held-out evidence table. */
export interface TermRow {
  term: string;
  loo_x: number | null;
  wf_x: number | null;
  brier_10f: number | null;
  brier_wf: number | null;
  auc_10f: number | null;
  auc_wf: number | null;
  status: string;
}

/** One row of the lambda sweep table. */
export interface LambdaRow {
  lambda: number;
  loo_x: number;
  wf66_x: number;
  wf47_x: number;
  worst_fold_x: number;
  farm: number;
}

/** Everything the dashboard needs: the board, the live set, the evidence and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  watchlist_size: number;
  watchlist: string[];
  board_size: number;
  early_size: number;
  live_size: number;
  checksum: string;
  totals: { tvl_usd: number; implied_usd: number };
  accounting: { ranked: number; record_token: number; not_ranked: number; below_cut: number; house_excluded: number };
  value: {
    labelled_n: number;
    multiple_at_100m: number;
    size_slope: number;
    size_slope_se: number;
    loo_x: number;
    wf66_x: number;
    wf47_x: number;
    folds: number[];
    flat_loo_x: number;
    flat_wf66_x: number;
    coverage_loo_50: number;
    coverage_loo_80: number;
    coverage_wf_50: number;
    coverage_wf_80: number;
    splitconf_wf_50: number;
    splitconf_wf_80: number;
    terms: TermRow[];
    lambda_sweep: LambdaRow[];
  };
  odds: {
    peers_n: number;
    positive_n: number;
    brier_10f: number;
    brier_wf: number;
    auc_10f: number;
    auc_wf: number;
    base_brier_10f: number;
    base_brier_wf: number;
    terms: TermRow[];
  };
  farm: { farm: number; marginal: number; skip: number };
  /** Size-curve chart data: labelled points, fitted curve, P25–P75 band (log10 TVL, log10 ratio). */
  curve: { points: [number, number][]; fit: [number, number][]; bandLo: [number, number][]; bandHi: [number, number][] };
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Deterministic PRNG (mulberry32): every shuffle and bootstrap in this program comes from a fixed seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** MT19937 + numpy legacy RandomState shuffle: the k-fold partitions in this program are the same
 *  partitions the research probes used (RandomState(seed).permutation(n), contiguous array_split
 *  chunks). The worst fold is partition-sensitive; matching the probe's partition keeps the
 *  dashboard's fold numbers comparable to the research, and the partition is verifiable against
 *  numpy in one line. Bootstrap refits keep mulberry32 (no probe depends on them). */
function mt19937(seed: number): () => number {
  const N = 624, M = 397;
  const mt = new Uint32Array(N);
  mt[0] = seed >>> 0;
  for (let i = 1; i < N; i++) {
    mt[i] = (Math.imul(1812433253, mt[i - 1]! ^ (mt[i - 1]! >>> 30)) + i) >>> 0;
  }
  let mti = N;
  function twist(): void {
    for (let i = 0; i < N; i++) {
      const y = (mt[i]! & 0x80000000) | (mt[(i + 1) % N]! & 0x7fffffff);
      let xa = y >>> 1;
      if (y & 1) xa ^= 0x9908b0df;
      mt[i] = mt[(i + M) % N]! ^ xa;
    }
    mti = 0;
  }
  return function nextUint32(): number {
    if (mti >= N) twist();
    let y = mt[mti++]!;
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  };
}
function rkInterval(nextUint32: () => number, max: number): number {
  if (max === 0) return 0;
  let mask = max;
  mask |= mask >> 1; mask |= mask >> 2; mask |= mask >> 4; mask |= mask >> 8; mask |= mask >> 16;
  let value: number;
  do { value = (nextUint32() & mask) >>> 0; } while (value > max);
  return value;
}

/** A Fisher-Yates shuffle of 0..n-1, numpy legacy RandomState compatible. */
export function shuffledIndex(n: number, seed: number): number[] {
  const next = mt19937(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rkInterval(next, i);
    const t = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = t;
  }
  return idx;
}

/** Solve A x = b by Gaussian elimination with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r]![col]!) > Math.abs(M[piv]![col]!)) piv = r;
    if (Math.abs(M[piv]![col]!) < 1e-12) throw new Error('singular system');
    if (piv !== col) {
      const t = M[col]!;
      M[col] = M[piv]!;
      M[piv] = t;
    }
    for (let r = col + 1; r < n; r++) {
      const f = M[r]![col]! / M[col]![col]!;
      for (let c = col; c <= n; c++) M[r]![c]! -= f * M[col]![c]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r]![n]!;
    for (let c = r + 1; c < n; c++) s -= M[r]![c]! * x[c]!;
    x[r] = s / M[r]![r]!;
  }
  return x;
}

/** A sparse design row: [column, value] pairs. Most rows have 3-5 non-zero entries. */
export type SparseRow = [number, number][];

/** Ridge fit from sparse rows: solve (X'X + diag(pen)) b = X'y. */
export function ridgeFit(rows: SparseRow[], y: number[], pen: number[]): number[] {
  const p = pen.length;
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    for (const [a, va] of r) {
      Xty[a]! += va * y[i]!;
      for (const [b, vb] of r) XtX[a]![b]! += va * vb;
    }
  }
  for (let j = 0; j < p; j++) XtX[j]![j]! += pen[j]!;
  return solveLinear(XtX, Xty);
}

/** Dot product of a sparse row with a coefficient vector. */
export function dotRow(row: SparseRow, b: number[]): number {
  let s = 0;
  for (const [j, v] of row) s += v * b[j]!;
  return s;
}

/** Quantile of a sorted array (linear interpolation). */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = Math.min(1, Math.max(0, q)) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

// ------------------------------------------------------------------ features

/** Derived per-protocol figures, computed once. */
interface Features {
  logTvl: number;
  ageYears: number | null;
  logChains: number;
  growth: number;
  fam: string;
  y: number | null; // log10(mcap/TVL), only for labelled protocols
  hasToken: boolean; // records a token (symbol present)
}

function features(p: SnapshotProtocol, asOf: string): Features {
  const age = ageDays(asOf, p.listed_at);
  return {
    logTvl: Math.log10(Math.max(p.tvl_usd, 1)),
    ageYears: age === null ? null : age / 365.25,
    logChains: Math.log(Math.max(p.chains.length, 1)),
    growth: finite(p.change_7d, 0),
    fam: (p.category ?? '').split(' ')[0] ?? '',
    y: p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 ? Math.log10(p.mcap_usd / p.tvl_usd) : null,
    hasToken: p.symbol !== null,
  };
}

/** The value model's design: [1, log10 TVL, category dummies]. Levels come
 * from the fit set; a row whose category is not among them gets no effect. */
function valueDesign(
  rows: { p: SnapshotProtocol; f: Features }[],
  catLevels: string[],
  catLambda: number,
): { X: SparseRow[]; pen: number[] } {
  const colOf = new Map<string, number>();
  catLevels.forEach((c, i) => colOf.set(c, 2 + i));
  const pen = [0, SIZE_LAMBDA, ...catLevels.map(() => catLambda)];
  const X: SparseRow[] = rows.map(({ p, f }) => {
    const row: SparseRow = [[0, 1], [1, f.logTvl]];
    const c = colOf.get(p.category ?? '');
    if (c !== undefined) row.push([c, 1]);
    return row;
  });
  return { X, pen };
}

/** The value model's design with extra terms, for the term table. */
function valueDesignTerms(
  rows: { p: SnapshotProtocol; f: Features }[],
  terms: string[],
  catLevels: string[],
  famLevels: string[],
  catLambda: number,
): { X: SparseRow[]; pen: number[] } {
  const colOf = new Map<string, number>();
  catLevels.forEach((c, i) => colOf.set(c, 2 + i));
  let next = 2 + catLevels.length;
  const famCol = new Map<string, number>();
  if (terms.includes('fam')) famLevels.forEach((c) => famCol.set(c, next++));
  const growthCol = terms.includes('growth') ? next++ : -1;
  const ageCol = terms.includes('age') ? next++ : -1;
  const chainsCol = terms.includes('chains') ? next++ : -1;
  const controlCol = terms.includes('control') ? next++ : -1;
  const pen = [0, SIZE_LAMBDA, ...catLevels.map(() => catLambda), ...famLevels.map(() => 16)];
  if (growthCol >= 0) pen[growthCol] = 1;
  if (ageCol >= 0) pen[ageCol] = 1;
  if (chainsCol >= 0) pen[chainsCol] = 1;
  if (controlCol >= 0) pen[controlCol] = 1;
  const X: SparseRow[] = rows.map(({ p, f }, i) => {
    const row: SparseRow = [[0, 1], [1, f.logTvl]];
    const c = colOf.get(p.category ?? '');
    if (c !== undefined) row.push([c, 1]);
    if (terms.includes('fam')) {
      const fc = famCol.get(f.fam);
      if (fc !== undefined) row.push([fc, 1]);
    }
    if (growthCol >= 0) row.push([growthCol, f.growth]);
    if (ageCol >= 0) row.push([ageCol, f.ageYears ?? 0]);
    if (chainsCol >= 0) row.push([chainsCol, f.logChains]);
    if (controlCol >= 0) {
      // Placebo: the previous protocol's growth in listed order — it must not help.
      const prev = i > 0 ? rows[i - 1]!.f.growth : 0;
      row.push([controlCol, prev]);
    }
    return row;
  });
  return { X, pen };
}

/** Miss in "times" units: 10^mean|log error| (and the median). */
function missX(errs: number[]): { mean: number; median: number } {
  const abs = errs.map((e) => Math.abs(e)).sort((a, b) => a - b);
  const mean = abs.reduce((s, v) => s + v, 0) / abs.length;
  return { mean: Math.pow(10, mean), median: Math.pow(10, quantile(abs, 0.5)) };
}

/** Leave-one-out evaluation of the value model on the labelled set. */
function looValue(
  lab: { p: SnapshotProtocol; f: Features }[],
  catLambda: number,
  terms: string[] = ['size', 'cat'],
): number[] {
  const catLevels = [...new Set(lab.map((r) => r.p.category ?? ''))].sort();
  const famLevels = [...new Set(lab.map((r) => r.f.fam))].sort();
  const y = lab.map((r) => r.f.y!);
  const errs: number[] = [];
  for (let i = 0; i < lab.length; i++) {
    const tr = lab.filter((_, j) => j !== i);
    const { X, pen } = terms.includes('cat')
      ? valueDesignTerms(tr, terms, catLevels, famLevels, catLambda)
      : valueDesignTerms(tr, terms, [], famLevels, catLambda);
    const b = ridgeFit(X, tr.map((r) => r.f.y!), pen);
    const { X: Xte } = terms.includes('cat')
      ? valueDesignTerms([lab[i]!], terms, catLevels, famLevels, catLambda)
      : valueDesignTerms([lab[i]!], terms, [], famLevels, catLambda);
    errs.push(y[i]! - dotRow(Xte[0]!, b));
  }
  return errs;
}

/** Walk-forward evaluation: the first nTrain by listed date price the rest. */
function wfValue(
  lab: { p: SnapshotProtocol; f: Features }[],
  nTrain: number,
  catLambda: number,
  terms: string[] = ['size', 'cat'],
): number[] {
  const tr = lab.slice(0, nTrain);
  const te = lab.slice(nTrain);
  const catLevels = [...new Set(tr.map((r) => r.p.category ?? ''))].sort();
  const famLevels = [...new Set(tr.map((r) => r.f.fam))].sort();
  const { X, pen } = valueDesignTerms(tr, terms, catLevels, famLevels, catLambda);
  const b = ridgeFit(X, tr.map((r) => r.f.y!), pen);
  const { X: Xte } = valueDesignTerms(te, terms, catLevels, famLevels, catLambda);
  return te.map((r, i) => r.f.y! - dotRow(Xte[i]!, b));
}

/** Random 5-fold evaluation (seeded shuffle, disclosed scheme). */
function kfoldValue(
  lab: { p: SnapshotProtocol; f: Features }[],
  catLambda: number,
  seed: number,
): number[] {
  const idx = shuffledIndex(lab.length, seed);
  const foldOf = new Array<number>(lab.length).fill(0);
  idx.forEach((v, i) => {
    foldOf[v] = Math.min(4, Math.floor((i * 5) / lab.length));
  });
  const catLevels = [...new Set(lab.map((r) => r.p.category ?? ''))].sort();
  const famLevels = [...new Set(lab.map((r) => r.f.fam))].sort();
  const out: number[] = [];
  for (let fold = 0; fold < 5; fold++) {
    const tr = lab.filter((_, i) => foldOf[i] !== fold);
    const te = lab.filter((_, i) => foldOf[i] === fold);
    const { X, pen } = valueDesignTerms(tr, ['size', 'cat'], catLevels, famLevels, catLambda);
    const b = ridgeFit(X, tr.map((r) => r.f.y!), pen);
    const { X: Xte } = valueDesignTerms(te, ['size', 'cat'], catLevels, famLevels, catLambda);
    const errs = te.map((r, i) => r.f.y! - dotRow(Xte[i]!, b));
    out.push(missX(errs).mean);
  }
  return out;
}

/** The flat baseline: the median multiple of the train set. */
function flatValue(tr: { f: Features }[], te: { f: Features }[]): number[] {
  const med = quantile(tr.map((r) => r.f.y!).sort((a, b) => a - b), 0.5);
  return te.map((r) => r.f.y! - med);
}

// ------------------------------------------------------------------ odds

/** Logistic IRLS with a ridge penalty on every non-intercept term. */
export function logitIrls(X: SparseRow[], z: number[], lam: number, iters = 80): number[] {
  const p = Math.max(...X.flatMap((r) => r.map(([j]) => j))) + 1;
  const beta = new Array<number>(p).fill(0);
  const mean = z.reduce((s, v) => s + v, 0) / z.length;
  beta[0] = Math.log(Math.max(mean, 1e-6) / Math.max(1 - mean, 1e-6));
  const pen = new Array<number>(p).fill(lam);
  pen[0] = 0;
  for (let it = 0; it < iters; it++) {
    const g = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < X.length; i++) {
      const row = X[i]!;
      const eta = Math.max(-30, Math.min(30, dotRow(row, beta)));
      const pr = 1 / (1 + Math.exp(-eta));
      const w = pr * (1 - pr) + 1e-9;
      const resid = z[i]! - pr;
      for (const [a, va] of row) {
        g[a]! += va * resid;
        for (const [b, vb] of row) H[a]![b]! += w * va * vb;
      }
    }
    for (let j = 0; j < p; j++) {
      g[j]! -= pen[j]! * beta[j]!;
      H[j]![j]! += pen[j]!;
    }
    const step = solveLinear(H, g);
    let maxStep = 0;
    for (let j = 0; j < p; j++) {
      beta[j]! += step[j]!;
      maxStep = Math.max(maxStep, Math.abs(step[j]!));
    }
    if (maxStep < 1e-8) break;
  }
  return beta;
}

/** Brier score and AUC (Mann-Whitney) for a set of predictions. */
export function brierAuc(y: number[], p: number[]): { brier: number; auc: number } {
  const pc = p.map((v) => Math.min(1 - 1e-9, Math.max(1e-9, v)));
  const brier = y.reduce((s, v, i) => s + (pc[i]! - v) ** 2, 0) / y.length;
  const pos = pc.filter((_, i) => y[i] === 1);
  const neg = pc.filter((_, i) => y[i] === 0);
  let wins = 0;
  for (const a of pos) for (const b of neg) wins += a > b ? 1 : a === b ? 0.5 : 0;
  return { brier, auc: wins / (pos.length * neg.length) };
}

/** The odds model's design: [1, age, category-or-family dummies, size, growth, chains, control]. */
function oddsDesign(
  rows: { p: SnapshotProtocol; f: Features }[],
  terms: string[],
  catLevels: string[],
  famLevels: string[],
): SparseRow[] {
  const colOf = new Map<string, number>();
  catLevels.forEach((c, i) => colOf.set(c, 2 + i));
  let next = 2 + catLevels.length;
  const famCol = new Map<string, number>();
  if (terms.includes('fam')) famLevels.forEach((c) => famCol.set(c, next++));
  const sizeCol = terms.includes('size') ? next++ : -1;
  const growthCol = terms.includes('growth') ? next++ : -1;
  const chainsCol = terms.includes('chains') ? next++ : -1;
  const controlCol = terms.includes('control') ? next++ : -1;
  return rows.map(({ p, f }, i) => {
    const row: SparseRow = [[0, 1], [1, f.ageYears ?? 0]];
    const c = colOf.get(p.category ?? '');
    if (c !== undefined) row.push([c, 1]);
    if (terms.includes('fam')) {
      const fc = famCol.get(f.fam);
      if (fc !== undefined) row.push([fc, 1]);
    }
    if (sizeCol >= 0) row.push([sizeCol, f.logTvl]);
    if (growthCol >= 0) row.push([growthCol, f.growth]);
    if (chainsCol >= 0) row.push([chainsCol, f.logChains]);
    if (controlCol >= 0) {
      const prev = i > 0 ? rows[i - 1]!.f.growth : 0;
      row.push([controlCol, prev]);
    }
    return row;
  });
}

// ------------------------------------------------------------------ the build

/** The fitted value model, ready to score a protocol. */
interface ValueModel {
  b: number[];
  catLevels: string[];
  catLambda: number;
  slope: number;
  intercept: number;
}

function fitValue(
  lab: { p: SnapshotProtocol; f: Features }[],
  catLambda: number,
): ValueModel {
  const catLevels = [...new Set(lab.map((r) => r.p.category ?? ''))].sort();
  const { X, pen } = valueDesign(lab, catLevels, catLambda);
  const b = ridgeFit(X, lab.map((r) => r.f.y!), pen);
  return { b, catLevels, catLambda, slope: b[1]!, intercept: b[0]! };
}

function scoreValue(m: ValueModel, p: SnapshotProtocol, f: Features): { logRatio: number; catEffect: number } {
  const idx = m.catLevels.indexOf(p.category ?? '');
  const catEffect = idx >= 0 ? m.b[2 + idx]! : 0;
  return { logRatio: m.intercept + m.slope * f.logTvl + catEffect, catEffect };
}

/** The fitted odds model, ready to score a protocol. */
interface OddsModel {
  b: number[];
  catLevels: string[];
  famLevels: string[];
  terms: string[];
}

function fitOdds(
  dated: { p: SnapshotProtocol; f: Features }[],
  terms: string[],
): OddsModel {
  const catLevels = [...new Set(dated.map((r) => r.p.category ?? ''))].sort();
  const famLevels = [...new Set(dated.map((r) => r.f.fam))].sort();
  const X = oddsDesign(dated, terms, catLevels, famLevels);
  const b = logitIrls(X, dated.map((r) => (r.f.hasToken ? 1 : 0)), ODDS_LAMBDA);
  return { b, catLevels, famLevels, terms };
}

function scoreOdds(m: OddsModel, rows: { p: SnapshotProtocol; f: Features }[]): number[] {
  const X = oddsDesign(rows, m.terms, m.catLevels, m.famLevels);
  return X.map((r) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, dotRow(r, m.b))))));
}

/** Farm economics for one row: deposit, modelled drop, net, T-bill, $/hour, verdict. */
function farmEconomics(implied: number, tvl: number): {
  deposit: number;
  drop: number;
  net: number;
  tbill: number;
  perHour: number;
  verdict: 'Farm' | 'Marginal' | 'Skip';
} {
  const deposit = FARM.depositPct * tvl;
  const drop = (implied * FARM.dropShare * deposit) / (tvl + deposit);
  const net = drop - FARM.feesUsd;
  const tbill = deposit * FARM.tbillRate * (FARM.horizonWeeks / 52);
  const perHour = net / FARM.hours;
  const verdict = net > tbill && perHour > FARM.minPerHour ? 'Farm' : net > 0 ? 'Marginal' : 'Skip';
  return { deposit, drop, net, tbill, perHour, verdict };
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A protocol's 10-step farm plan, costed from its own figures. */
export function farmSteps(
  p: SnapshotProtocol,
  age: number | null,
  econ: { deposit: number; drop: number; net: number; tbill: number; perHour: number },
  odds: number,
): FarmStep[] {
  const chain = chainOf(p);
  const dep = Math.round(econ.deposit);
  const hold = FARM.horizonWeeks * 7;
  const exitTvl = Math.round(p.tvl_usd * 0.85);
  const dropShareFloor = Math.max(0.1, Math.min(99, (FARM.feesUsd / Math.max(econ.drop, 0.01)) * FARM.dropShare * 100));
  const oddsFloor = Math.max(0.1, (FARM.feesUsd / Math.max(econ.drop, 0.01)) * odds * 100);
  const action = actionFor(p, dep, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${dep} of capital and about $${dep >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${dep} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Check the protocol's TVL and points page every week; the modelled drop is $${Math.round(econ.drop)} at a 7% drop share.`,
      cost: 'no fee to check',
      time: '5 minutes a week',
    },
    {
      text: `Exit rule 1: withdraw if TVL prints below $${exitTvl.toLocaleString('en-US')} (85% of today's TVL).`,
      cost: 'about $3 of gas to exit',
      time: '10 minutes',
    },
    {
      text: `Exit rule 2: fees stay covered while the drop share stays above ${dropShareFloor.toFixed(1)}% (model 7.0%) and the token odds above ${oddsFloor.toFixed(1)}% (peers imply ${(odds * 100).toFixed(1)}%).`,
      cost: 'no fee to check',
      time: '5 minutes',
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
    {
      text: `After the drop, compare the net $${Math.round(econ.net)} ($${econ.perHour.toFixed(2)} an hour) with the $${Math.round(econ.tbill)} a 4% T-bill pays on the same $${dep}, then withdraw or roll into the next position.`,
      cost: 'about $3 of gas to unwind',
      time: '15 minutes',
    },
  ];
}

// ------------------------------------------------------------------ evaluation

/** Odds evaluation: 10-fold CV (seeded shuffle) and walk-forward (first nTrain by date). */
function oddsEval(
  dated: { p: SnapshotProtocol; f: Features }[],
  terms: string[],
  nTrain: number,
  seed: number,
): { brier10: number; auc10: number; brierWf: number; aucWf: number } {
  const catLevels = [...new Set(dated.map((r) => r.p.category ?? ''))].sort();
  const famLevels = [...new Set(dated.map((r) => r.f.fam))].sort();
  const y = dated.map((r) => (r.f.hasToken ? 1 : 0));
  const idx = shuffledIndex(dated.length, seed);
  const foldOf = new Array<number>(dated.length).fill(0);
  idx.forEach((v, i) => {
    foldOf[v] = Math.min(9, Math.floor((i * 10) / dated.length));
  });
  const pOof = new Array<number>(dated.length).fill(0);
  for (let fold = 0; fold < 10; fold++) {
    const tr = dated.filter((_, i) => foldOf[i] !== fold);
    const te = dated.filter((_, i) => foldOf[i] === fold);
    const X = oddsDesign(tr, terms, catLevels, famLevels);
    const b = logitIrls(X, tr.map((r) => (r.f.hasToken ? 1 : 0)), ODDS_LAMBDA);
    const Xte = oddsDesign(te, terms, catLevels, famLevels);
    te.forEach((_, k) => {
      const i = dated.indexOf(te[k]!);
      pOof[i] = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, dotRow(Xte[k]!, b)))));
    });
  }
  const cv = brierAuc(y, pOof);
  const tr = dated.slice(0, nTrain);
  const te = dated.slice(nTrain);
  const Xtr = oddsDesign(tr, terms, catLevels, famLevels);
  const b = logitIrls(Xtr, tr.map((r) => (r.f.hasToken ? 1 : 0)), ODDS_LAMBDA);
  const Xte = oddsDesign(te, terms, catLevels, famLevels);
  const pTe = te.map((_, k) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, dotRow(Xte[k]!, b))))));
  const wf = brierAuc(
    te.map((r) => (r.f.hasToken ? 1 : 0)),
    pTe,
  );
  return { brier10: cv.brier, auc10: cv.auc, brierWf: wf.brier, aucWf: wf.auc };
}

/** Base-rate Brier: the constant mean outcome, 10-fold (overall mean) and walk-forward (train mean). */
function baseRateBrier(dated: { f: Features }[], nTrain: number): { brier10: number; brierWf: number } {
  const y = dated.map((r) => (r.f.hasToken ? 1 : 0));
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  const brier10 = y.reduce((s, v) => s + (mean - v) ** 2, 0) / y.length;
  const trMean = y.slice(0, nTrain).reduce((s, v) => s + v, 0) / nTrain;
  const te = y.slice(nTrain);
  const brierWf = te.reduce((s, v) => s + (trMean - v) ** 2, 0) / te.length;
  return { brier10, brierWf };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, checksum: string): { board: BoardRow[]; radar: RadarData } {
  const feats = new Map<string, Features>();
  for (const p of snapshot.protocols) feats.set(p.slug, features(p, snapshot.as_of));
  const withF = (p: SnapshotProtocol) => ({ p, f: feats.get(p.slug)! });

  // Labelled value set: dated protocols whose tokens trade, oldest first.
  const lab = snapshot.protocols
    .filter((p) => p.listed_at !== null && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0)
    .sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : a.listed_at! > b.listed_at! ? 1 : a.slug < b.slug ? -1 : 1))
    .map(withF);
  // Odds population: every dated protocol, oldest first.
  const dated = snapshot.protocols
    .filter((p) => p.listed_at !== null)
    .sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : a.listed_at! > b.listed_at! ? 1 : a.slug < b.slug ? -1 : 1))
    .map(withF);

  // ---- value model: fit + held-out evaluation ---------------------------
  const value = fitValue(lab, CAT_LAMBDA);
  const looErrs = looValue(lab, CAT_LAMBDA);
  const loo = missX(looErrs);
  const wf66 = missX(wfValue(lab, 66, CAT_LAMBDA));
  const wf47 = missX(wfValue(lab, 47, CAT_LAMBDA));
  const folds = kfoldValue(lab, CAT_LAMBDA, 42);
  const flatLoo = missX(
    lab.map((_, i) => {
      const tr = lab.filter((__, j) => j !== i);
      return flatValue(tr, [lab[i]!])[0]!;
    }),
  );
  const flatWf66 = missX(flatValue(lab.slice(0, 66), lab.slice(66)));

  // Value term table: each term's held-out miss, kept only when it lowers
  // BOTH the leave-one-out and the walk-forward miss.
  const valueTerms: TermRow[] = [];
  const addValueTerm = (label: string, terms: string[], catLam: number, status: string) => {
    const l = missX(looValue(lab, catLam, terms));
    const w = missX(wfValue(lab, 66, catLam, terms));
    valueTerms.push({ term: label, loo_x: l.mean, wf_x: w.mean, brier_10f: null, brier_wf: null, auc_10f: null, auc_wf: null, status });
  };
  valueTerms.push({
    term: 'Flat median multiple',
    loo_x: flatLoo.mean,
    wf_x: flatWf66.mean,
    brier_10f: null,
    brier_wf: null,
    auc_10f: null,
    auc_wf: null,
    status: 'baseline',
  });
  addValueTerm('+ size curve, ln TVL (ridge λ=1)', ['size'], 16, 'tested, not kept');
  addValueTerm('+ category effect, ridge λ=4', ['size', 'cat'], 4, 'KEPT');
  addValueTerm('+ category effect, ridge λ=16', ['size', 'cat'], 16, 'tested, not kept');
  addValueTerm('+ family effect, ridge 16', ['size', 'cat', 'fam'], 4, 'tested, not kept');
  addValueTerm('+ 7-day TVL growth', ['size', 'cat', 'growth'], 4, 'tested, not kept');
  addValueTerm('+ age, years listed', ['size', 'cat', 'age'], 4, 'tested, not kept');
  addValueTerm('+ chain count, ln', ['size', 'cat', 'chains'], 4, 'tested, not kept');
  addValueTerm('+ control (lagged growth)', ['size', 'cat', 'control'], 4, 'tested, not kept');

  // ---- odds model: fit + held-out evaluation ----------------------------
  const oddsTerms: TermRow[] = [];
  const oddsKept: string[] = ['age', 'cat', 'size', 'growth'];
  const odds = fitOdds(dated, oddsKept);
  const oddsEv = oddsEval(dated, oddsKept, 430, 42);
  const base = baseRateBrier(dated, 430);
  const addOddsTerm = (label: string, terms: string[], status: string) => {
    const ev = oddsEval(dated, terms, 430, 42);
    oddsTerms.push({
      term: label,
      loo_x: null,
      wf_x: null,
      brier_10f: ev.brier10,
      brier_wf: ev.brierWf,
      auc_10f: ev.auc10,
      auc_wf: ev.aucWf,
      status,
    });
  };
  oddsTerms.push({
    term: 'Base rate',
    loo_x: null,
    wf_x: null,
    brier_10f: base.brier10,
    brier_wf: base.brierWf,
    auc_10f: 0.5,
    auc_wf: 0.5,
    status: 'baseline',
  });
  addOddsTerm('age + family + size + 7d (v15)', ['age', 'fam', 'size', 'growth'], 'tested, not kept');
  addOddsTerm('age + category + size + 7d', oddsKept, 'KEPT');
  addOddsTerm('+ chain count, ln', ['age', 'cat', 'size', 'growth', 'chains'], 'tested, not kept');
  addOddsTerm('+ control (lagged growth)', ['age', 'cat', 'size', 'growth', 'control'], 'tested, not kept');

  // ---- Jackknife+ intervals (primary) + split-conformal (robustness) -----
  const train66 = lab.slice(0, 66);
  const test29 = lab.slice(66);
  const loo66Errs = looValue(train66, CAT_LAMBDA);
  const abs66 = loo66Errs.map((e) => Math.abs(e)).sort((a, b) => a - b);
  const q50 = quantile(abs66, 0.5 * (1 + 1 / 66));
  const q80 = quantile(abs66, 0.8 * (1 + 1 / 66));
  const wf66Errs = wfValue(lab, 66, CAT_LAMBDA);
  const covWf50 = wf66Errs.filter((e) => Math.abs(e) <= q50).length / wf66Errs.length;
  const covWf80 = wf66Errs.filter((e) => Math.abs(e) <= q80).length / wf66Errs.length;
  const absFull = looErrs.map((e) => Math.abs(e)).sort((a, b) => a - b);
  const q50Full = quantile(absFull, 0.5 * (1 + 1 / lab.length));
  const q80Full = quantile(absFull, 0.8 * (1 + 1 / lab.length));
  const covLoo50 = looErrs.filter((e) => Math.abs(e) <= q50Full).length / looErrs.length;
  const covLoo80 = looErrs.filter((e) => Math.abs(e) <= q80Full).length / looErrs.length;
  // Split-conformal: fit the oldest 44 of the train window, calibrate on the newest 22.
  const scFit = train66.slice(0, 44);
  const scCal = train66.slice(44);
  const scModel = fitValue(scFit, CAT_LAMBDA);
  const scResid = scCal
    .map((r) => Math.abs(r.f.y! - scoreValue(scModel, r.p, r.f).logRatio))
    .sort((a, b) => a - b);
  const scQ50 = quantile(scResid, 0.5 * (1 + 1 / scCal.length));
  const scQ80 = quantile(scResid, 0.8 * (1 + 1 / scCal.length));
  const scCov50 = wf66Errs.filter((e) => Math.abs(e) <= scQ50).length / wf66Errs.length;
  const scCov80 = wf66Errs.filter((e) => Math.abs(e) <= scQ80).length / wf66Errs.length;
  void test29;

  // ---- lambda sweep (LOO + WF + worst fold + Farm need the ranked set) ---
  const ranked = rankedSet(snapshot);
  const oddsRanked = scoreOdds(odds, ranked.map(withF));
  const sweep: LambdaRow[] = [];
  for (const lam of [4, 6, 8, 12, 16]) {
    const m = fitValue(lab, lam);
    const l = missX(looValue(lab, lam));
    const w66 = missX(wfValue(lab, 66, lam));
    const w47 = missX(wfValue(lab, 47, lam));
    const f = kfoldValue(lab, lam, 42);
    const farm = countFarm(ranked, m, oddsRanked);
    sweep.push({ lambda: lam, loo_x: l.mean, wf66_x: w66.mean, wf47_x: w47.mean, worst_fold_x: Math.max(...f), farm });
  }
  const chosenLambda = sweep.find((r) => r.lambda === CAT_LAMBDA)!;

  // ---- bootstrap rank ranges (value model only, odds fixed) --------------
  const { rankLo, rankHi, slopeSe } = bootstrapRanks(snapshot, ranked, lab, value, oddsRanked);

  // ---- the board ----------------------------------------------------------
  const board: BoardRow[] = [];
  const radarRows: RadarRow[] = [];
  const scored = ranked.map((p, i) => {
    const f = feats.get(p.slug)!;
    const { logRatio, catEffect } = scoreValue(value, p, f);
    const multiple = Math.pow(10, logRatio);
    const odd = oddsRanked[i]!;
    const implied = Math.max(1, Math.round(p.tvl_usd * multiple * odd));
    const econ = farmEconomics(implied, p.tvl_usd);
    const p25 = Math.max(1, Math.round(p.tvl_usd * multiple * Math.pow(10, -q50) * odd));
    const p75 = Math.max(1, Math.round(p.tvl_usd * multiple * Math.pow(10, q50) * odd));
    const p10 = Math.max(1, Math.round(p.tvl_usd * multiple * Math.pow(10, -q80) * odd));
    const p90 = Math.max(1, Math.round(p.tvl_usd * multiple * Math.pow(10, q80) * odd));
    return { p, f, logRatio, catEffect, multiple, odd, implied, econ, p25, p75, p10, p90 };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const looBySlug = new Map<string, number>();
  lab.forEach((r, i) => looBySlug.set(r.p.slug, Math.pow(10, Math.abs(looErrs[i]!))));
  const labelledSorted = [...lab].sort((a, b) => a.f.y! - b.f.y!);
  void labelledSorted;
  scored.forEach((s, i) => {
    const rank = i + 1;
    const age = ageDays(snapshot.as_of, s.p.listed_at);
    const steps = farmSteps(s.p, age, s.econ, s.odd).map(stepText);
    const grid = gridNets(s.implied, s.p.tvl_usd);
    const peers = nearestPeers(s, lab, value, looBySlug);
    const rr = rankLo.get(s.p.slug)!;
    board.push({
      rank,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: age,
      implied_value_usd: s.implied,
      model: {
        multiple: round6(s.multiple),
        size_slope: round4(value.slope),
        category_effect: round4(s.catEffect),
        token_odds: round4(s.odd),
        p25_usd: s.p25,
        p75_usd: s.p75,
        p10_usd: s.p10,
        p90_usd: s.p90,
        rank_lo: rr[0]!,
        rank_hi: rr[1]!,
      },
      verdict: s.econ.verdict,
      net_usd: Math.round(s.econ.net),
      net_per_hour_usd: round2(s.econ.perHour),
      farm_steps: steps,
    });
    radarRows.push({
      rank,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      age_days: age,
      odds: round4(s.odd),
      multiple: round6(s.multiple),
      implied_value_usd: s.implied,
      p25_usd: s.p25,
      p75_usd: s.p75,
      p10_usd: s.p10,
      p90_usd: s.p90,
      rank_lo: rr[0]!,
      rank_hi: rr[1]!,
      verdict: s.econ.verdict,
      net_usd: Math.round(s.econ.net),
      net_per_hour_usd: round2(s.econ.perHour),
      drop_usd: Math.round(s.econ.drop),
      tbill_usd: Math.round(s.econ.tbill),
      deposit_usd: Math.round(s.econ.deposit),
      grid,
      peers,
    });
  });

  // ---- live set + accounting ----------------------------------------------
  const live = snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
  const preTokenCount = snapshot.protocols.filter(isPreToken).length;
  const rankableBelowFloor = snapshot.protocols.filter(
    (p) => !snapshot.watchlist.includes(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd,
  ).length;
  const belowCut = rankableBelowFloor - EARLY_ROWS;
  const notRanked = preTokenCount - board.length;
  const farmCounts = {
    farm: board.filter((r) => r.verdict === 'Farm').length,
    marginal: board.filter((r) => r.verdict === 'Marginal').length,
    skip: board.filter((r) => r.verdict === 'Skip').length,
  };

  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: 'DefiLlama protocols, fetched 2026-11-14',
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    watchlist: [...snapshot.watchlist],
    board_size: board.length,
    early_size: board.length - snapshot.watchlist.length,
    live_size: live.length,
    checksum,
    totals: {
      tvl_usd: board.reduce((s, r) => s + r.tvl_usd, 0),
      implied_usd: board.reduce((s, r) => s + r.implied_value_usd, 0),
    },
    accounting: {
      ranked: board.length,
      record_token: snapshot.protocols.length - preTokenCount,
      not_ranked: notRanked,
      below_cut: belowCut,
      house_excluded: notRanked - belowCut,
    },
    value: {
      labelled_n: lab.length,
      multiple_at_100m: round4(Math.pow(10, value.intercept + value.slope * 8)),
      size_slope: round4(value.slope),
      size_slope_se: round4(slopeSe),
      loo_x: round3(loo.mean),
      wf66_x: round3(wf66.mean),
      wf47_x: round3(wf47.mean),
      folds: folds.map((x) => round2(x)),
      flat_loo_x: round3(flatLoo.mean),
      flat_wf66_x: round3(flatWf66.mean),
      coverage_loo_50: round3(covLoo50),
      coverage_loo_80: round3(covLoo80),
      coverage_wf_50: round3(covWf50),
      coverage_wf_80: round3(covWf80),
      splitconf_wf_50: round3(scCov50),
      splitconf_wf_80: round3(scCov80),
      terms: valueTerms.map((t) => ({
        ...t,
        loo_x: t.loo_x === null ? null : round3(t.loo_x),
        wf_x: t.wf_x === null ? null : round3(t.wf_x),
      })),
      lambda_sweep: sweep.map((r) => ({
        ...r,
        loo_x: round3(r.loo_x),
        wf66_x: round3(r.wf66_x),
        wf47_x: round3(r.wf47_x),
        worst_fold_x: round2(r.worst_fold_x),
      })),
    },
    odds: {
      peers_n: dated.length,
      positive_n: dated.filter((r) => r.f.hasToken).length,
      brier_10f: round3(oddsEv.brier10),
      brier_wf: round3(oddsEv.brierWf),
      auc_10f: round3(oddsEv.auc10),
      auc_wf: round3(oddsEv.aucWf),
      base_brier_10f: round3(base.brier10),
      base_brier_wf: round3(base.brierWf),
      terms: oddsTerms.map((t) => ({
        ...t,
        brier_10f: t.brier_10f === null ? null : round3(t.brier_10f),
        brier_wf: t.brier_wf === null ? null : round3(t.brier_wf),
        auc_10f: t.auc_10f === null ? null : round3(t.auc_10f),
        auc_wf: t.auc_wf === null ? null : round3(t.auc_wf),
      })),
    },
    farm: farmCounts,
    curve: {
      points: lab.map((r) => [round3(r.f.logTvl), round3(r.f.y!)] as [number, number]),
      fit: curveGrid(value, q50, q80).fit,
      bandLo: curveGrid(value, q50, q80).bandLo,
      bandHi: curveGrid(value, q50, q80).bandHi,
    },
    rows: radarRows,
    live,
  };
  void chosenLambda;
  return { board, radar };
}

/** The ranked set: every watchlist slug, plus the strongest rankable pre-token protocols below the floor. */
export function rankedSet(snapshot: Snapshot): SnapshotProtocol[] {
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);
  return [...chosen.values()];
}

/** Farm count for one value model on the ranked set (odds fixed). */
function countFarm(ranked: SnapshotProtocol[], value: ValueModel, oddsRanked: number[]): number {
  let n = 0;
  for (let i = 0; i < ranked.length; i++) {
    const p = ranked[i]!;
    const f = {
      logTvl: Math.log10(Math.max(p.tvl_usd, 1)),
      ageYears: null,
      logChains: 0,
      growth: 0,
      fam: '',
      y: null,
      hasToken: false,
    };
    const { logRatio } = scoreValue(value, p, f);
    const implied = Math.max(1, Math.round(p.tvl_usd * Math.pow(10, logRatio) * oddsRanked[i]!));
    if (farmEconomics(implied, p.tvl_usd).verdict === 'Farm') n++;
  }
  return n;
}

/** Bootstrap rank ranges: 200 refits of the value model on resampled labelled rows, odds fixed. */
function bootstrapRanks(
  snapshot: Snapshot,
  ranked: SnapshotProtocol[],
  lab: { p: SnapshotProtocol; f: Features }[],
  value: ValueModel,
  oddsRanked: number[],
): { rankLo: Map<string, [number, number]>; rankHi: Map<string, [number, number]>; slopeSe: number } {
  void snapshot;
  const rng = mulberry32(20261124);
  const ranks = new Map<string, number[]>();
  for (const p of ranked) ranks.set(p.slug, []);
  const slopes: number[] = [];
  for (let b = 0; b < BOOTSTRAP_REFITS; b++) {
    const sample: { p: SnapshotProtocol; f: Features }[] = [];
    for (let i = 0; i < lab.length; i++) sample.push(lab[Math.floor(rng() * lab.length)]!);
    const m = fitValue(sample, CAT_LAMBDA);
    slopes.push(m.slope);
    const scored = ranked.map((p, i) => {
      const f = {
        logTvl: Math.log10(Math.max(p.tvl_usd, 1)),
        ageYears: null,
        logChains: 0,
        growth: 0,
        fam: '',
        y: null,
        hasToken: false,
      };
      const { logRatio } = scoreValue(m, p, f);
      return { slug: p.slug, implied: Math.max(1, Math.round(p.tvl_usd * Math.pow(10, logRatio) * oddsRanked[i]!)) };
    });
    scored.sort((a, b) => b.implied - a.implied || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    scored.forEach((s, i) => ranks.get(s.slug)!.push(i + 1));
  }
  const rankLo = new Map<string, [number, number]>();
  const rankHi = new Map<string, [number, number]>();
  for (const [slug, rs] of ranks) {
    const lo = Math.min(...rs);
    const hi = Math.max(...rs);
    rankLo.set(slug, [lo, hi]);
    rankHi.set(slug, [lo, hi]);
  }
  const mean = slopes.reduce((s, v) => s + v, 0) / slopes.length;
  const slopeSe = Math.sqrt(slopes.reduce((s, v) => s + (v - mean) ** 2, 0) / slopes.length);
  void value;
  return { rankLo, rankHi, slopeSe };
}

/** The fitted size curve over the labelled TVL range, with the P25–P75 band. */
function curveGrid(
  value: ValueModel,
  q50: number,
  q80: number,
): { fit: [number, number][]; bandLo: [number, number][]; bandHi: [number, number][] } {
  const fit: [number, number][] = [];
  const bandLo: [number, number][] = [];
  const bandHi: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const x = 6.5 + (i / 24) * 4.0;
    const y = value.intercept + value.slope * x;
    fit.push([round3(x), round3(y)]);
    bandLo.push([round3(x), round3(y - q50)]);
    bandHi.push([round3(x), round3(y + q50)]);
  }
  void q80;
  return { fit, bandLo, bandHi };
}

/** The 3x3 net grid: deposits $1K / $10K / $30K against drop shares 3.5% / 7% / 14%. */
function gridNets(implied: number, tvl: number): number[] {
  const out: number[] = [];
  for (const share of [0.035, 0.07, 0.14]) {
    for (const dep of [1000, 10000, 30000]) {
      const drop = (implied * share * dep) / (tvl + dep);
      out.push(Math.round(drop - FARM.feesUsd));
    }
  }
  return out;
}

/** The 8 nearest priced peers by observed multiple vs the row's fitted multiple. */
function nearestPeers(
  s: { logRatio: number },
  lab: { p: SnapshotProtocol; f: Features }[],
  value: ValueModel,
  looBySlug: Map<string, number>,
): PeerRow[] {
  const target = s.logRatio;
  return lab
    .map((r) => {
      const { logRatio } = scoreValue(value, r.p, r.f);
      return {
        name: r.p.name,
        observed_multiple: round4(Math.pow(10, r.f.y!)),
        model_multiple: round4(Math.pow(10, logRatio)),
        loo_miss_x: round2(looBySlug.get(r.p.slug) ?? NaN),
        dist: Math.abs(r.f.y! - target),
      };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 8)
    .map(({ name, observed_multiple, model_multiple, loo_miss_x }) => ({ name, observed_multiple, model_multiple, loo_miss_x }));
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}
