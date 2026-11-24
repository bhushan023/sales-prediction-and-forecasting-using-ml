import type {
  EvaluationMetrics,
  FeatureImportanceItem,
  ForecastMethodId,
  ForecastPoint,
  ForecastResult,
  ModelId,
  PredictionInput,
  PredictionOutput,
  RegressionModelId,
  SalesRecord,
  TestPredictionPoint,
  TrainedModelSummary,
  TrainingConfig,
  TrainingResult,
} from '../types/sales.ts';

// Deterministic PRNG for reproducible Random Forest training
function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function computeEvaluationMetrics(actuals: number[], predictions: number[]): EvaluationMetrics {
  const n = Math.min(actuals.length, predictions.length);
  if (n === 0) {
    return { mae: 0, mse: 0, rmse: 0, r2: 0, mape: null, validMapeCount: 0 };
  }

  let absErrSum = 0;
  let sqErrSum = 0;
  let actualSum = 0;
  let apeSum = 0;
  let validMapeCount = 0;

  for (let i = 0; i < n; i++) {
    const a = actuals[i];
    const p = predictions[i];
    const err = a - p;
    absErrSum += Math.abs(err);
    sqErrSum += err * err;
    actualSum += a;
    if (Math.abs(a) > 1e-6) {
      apeSum += Math.abs(err / a);
      validMapeCount++;
    }
  }

  const mae = absErrSum / n;
  const mse = sqErrSum / n;
  const rmse = Math.sqrt(mse);
  const meanActual = actualSum / n;

  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const diff = actuals[i] - meanActual;
    ssTot += diff * diff;
  }

  const r2 = ssTot > 1e-9 ? 1 - sqErrSum / ssTot : 0;
  const mape = validMapeCount > 0 ? (apeSum / validMapeCount) * 100 : null;

  return {
    mae: Number(mae.toFixed(4)),
    mse: Number(mse.toFixed(4)),
    rmse: Number(rmse.toFixed(4)),
    r2: Number(r2.toFixed(4)),
    mape: mape !== null ? Number(mape.toFixed(2)) : null,
    validMapeCount,
  };
}

// ============================================================================
// Feature Engineering (Strictly Causal & Leak-Free)
// ============================================================================

interface FeatureMetadata {
  featureNames: string[];
  includeQtyPrice: boolean;
  minTimestamp: number;
  maxTimestamp: number;
  globalTrainMean: number;
  productMeans: Record<string, number>;
  categoryMeans: Record<string, number>;
  regionMeans: Record<string, number>;
  typicalQtyByProduct: Record<string, number>;
  lastSalesHistory: number[]; // trailing 7 sales from end of dataset
}

function smoothedTargetEncode(
  records: SalesRecord[],
  keyFn: (r: SalesRecord) => string,
  globalMean: number,
  smoothing = 5
): Record<string, number> {
  const stats = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const k = keyFn(r);
    const cur = stats.get(k) || { sum: 0, count: 0 };
    cur.sum += r.sales;
    cur.count += 1;
    stats.set(k, cur);
  }
  const encoded: Record<string, number> = {};
  for (const [k, s] of stats.entries()) {
    encoded[k] = (s.sum + smoothing * globalMean) / (s.count + smoothing);
  }
  return encoded;
}

function buildFeatureMetadata(allRecords: SalesRecord[], trainRecords: SalesRecord[]): FeatureMetadata {
  const trainMean =
    trainRecords.reduce((acc, r) => acc + r.sales, 0) / Math.max(1, trainRecords.length);

  // Detect whether Quantity/Unit Price carry genuine independent information
  // (versus a 2-column Date,Sales dataset where unitPrice was auto-filled as sales/1)
  const hasIndependentPriceOrQty = !trainRecords.every(
    (r) => r.quantity === 1 && Math.abs(r.unitPrice - r.sales) < 0.01
  );

  const minTimestamp = trainRecords[0].timestamp;
  const maxTimestamp = Math.max(minTimestamp + 86400000, trainRecords[trainRecords.length - 1].timestamp);

  const productMeans = smoothedTargetEncode(trainRecords, (r) => r.product, trainMean);
  const categoryMeans = smoothedTargetEncode(trainRecords, (r) => r.category, trainMean);
  const regionMeans = smoothedTargetEncode(trainRecords, (r) => r.region, trainMean);

  const qtyStats = new Map<string, { sum: number; count: number }>();
  for (const r of allRecords) {
    const cur = qtyStats.get(r.product) || { sum: 0, count: 0 };
    cur.sum += r.quantity;
    cur.count += 1;
    qtyStats.set(r.product, cur);
  }
  const typicalQtyByProduct: Record<string, number> = {};
  for (const [k, s] of qtyStats.entries()) {
    typicalQtyByProduct[k] = s.sum / s.count;
  }

  const featureNames: string[] = [];
  if (hasIndependentPriceOrQty) {
    featureNames.push('Quantity', 'Unit Price', 'Gross Value (Qty × Price)');
  }
  featureNames.push(
    'Day of Month',
    'Month (Sin)',
    'Month (Cos)',
    'Day of Week (Sin)',
    'Day of Week (Cos)',
    'Time Trend Index',
    'Lag-1 Sales',
    'Rolling 7-Order Mean',
    'Product Signal',
    'Category Signal',
    'Region Signal'
  );

  const lastSalesHistory = allRecords.slice(-7).map((r) => r.sales);

  return {
    featureNames,
    includeQtyPrice: hasIndependentPriceOrQty,
    minTimestamp,
    maxTimestamp,
    globalTrainMean: trainMean,
    productMeans,
    categoryMeans,
    regionMeans,
    typicalQtyByProduct,
    lastSalesHistory,
  };
}

function extractRowFeatures(
  dateTimestamp: number,
  product: string,
  category: string,
  region: string,
  quantity: number,
  unitPrice: number,
  lag1Sales: number,
  rolling7Mean: number,
  meta: FeatureMetadata
): number[] {
  const dt = new Date(dateTimestamp);
  const dayOfMonth = dt.getUTCDate();
  const month = dt.getUTCMonth() + 1;
  const dow = dt.getUTCDay();

  const monthAngle = (2 * Math.PI * month) / 12;
  const dowAngle = (2 * Math.PI * dow) / 7;
  const span = Math.max(1, meta.maxTimestamp - meta.minTimestamp);
  const timeIndex = (dateTimestamp - meta.minTimestamp) / span;

  const prodEnc = meta.productMeans[product] ?? meta.globalTrainMean;
  const catEnc = meta.categoryMeans[category] ?? meta.globalTrainMean;
  const regEnc = meta.regionMeans[region] ?? meta.globalTrainMean;

  const vec: number[] = [];
  if (meta.includeQtyPrice) {
    vec.push(quantity, unitPrice, quantity * unitPrice);
  }
  vec.push(
    dayOfMonth,
    Math.sin(monthAngle),
    Math.cos(monthAngle),
    Math.sin(dowAngle),
    Math.cos(dowAngle),
    timeIndex,
    lag1Sales,
    rolling7Mean,
    prodEnc,
    catEnc,
    regEnc
  );
  return vec;
}

function buildFeatureMatrix(records: SalesRecord[], meta: FeatureMetadata): { X: number[][]; y: number[] } {
  const X: number[][] = [];
  const y: number[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const lag1 = i > 0 ? records[i - 1].sales : meta.globalTrainMean;
    let rollSum = 0;
    let rollCount = 0;
    for (let j = Math.max(0, i - 7); j < i; j++) {
      rollSum += records[j].sales;
      rollCount++;
    }
    const rolling7 = rollCount > 0 ? rollSum / rollCount : meta.globalTrainMean;

    X.push(
      extractRowFeatures(
        r.timestamp,
        r.product,
        r.category,
        r.region,
        r.quantity,
        r.unitPrice,
        lag1,
        rolling7,
        meta
      )
    );
    y.push(r.sales);
  }

  return { X, y };
}

// ============================================================================
// 1. Multivariate Linear Regression (Ridge-Regularized Normal Equation)
// ============================================================================

export interface LinearRegressionModel {
  means: number[];
  stds: number[];
  weights: number[]; // [intercept, w1, w2, ...]
  featureImportances: FeatureImportanceItem[];
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = row;
      }
    }
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) {
      M[col][col] = 1e-12;
    }

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / (Math.abs(M[i][i]) > 1e-12 ? M[i][i] : 1e-12);
  }
  return x;
}

export function trainLinearRegression(
  X: number[][],
  y: number[],
  featureNames: string[],
  lambda = 0.05
): LinearRegressionModel {
  const n = X.length;
  const p = X[0]?.length || 0;

  const means = new Array<number>(p).fill(0);
  const stds = new Array<number>(p).fill(1);

  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j];
    means[j] = s / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) {
      const d = X[i][j] - means[j];
      varSum += d * d;
    }
    const std = Math.sqrt(varSum / Math.max(1, n));
    stds[j] = std > 1e-9 ? std : 1;
  }

  const dim = p + 1;
  const XtX: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  const Xty = new Array<number>(dim).fill(0);

  for (let i = 0; i < n; i++) {
    const z = new Array<number>(dim);
    z[0] = 1;
    for (let j = 0; j < p; j++) {
      z[j + 1] = (X[i][j] - means[j]) / stds[j];
    }
    const yi = y[i];
    for (let r = 0; r < dim; r++) {
      Xty[r] += z[r] * yi;
      for (let c = r; c < dim; c++) {
        XtX[r][c] += z[r] * z[c];
      }
    }
  }

  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < r; c++) {
      XtX[r][c] = XtX[c][r];
    }
    if (r > 0) {
      XtX[r][r] += lambda;
    }
  }

  const weights = solveLinearSystem(XtX, Xty);

  const absW = weights.slice(1).map((w) => Math.abs(w));
  const sumW = absW.reduce((a, b) => a + b, 0) || 1;
  const featureImportances: FeatureImportanceItem[] = featureNames
    .map((feature, idx) => ({
      feature,
      importance: Number(((absW[idx] / sumW) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.importance - a.importance);

  return { means, stds, weights, featureImportances };
}

export function predictLinearRegression(model: LinearRegressionModel, x: number[]): number {
  let pred = model.weights[0];
  for (let j = 0; j < x.length; j++) {
    const z = (x[j] - model.means[j]) / model.stds[j];
    pred += model.weights[j + 1] * z;
  }
  return Math.max(0, pred);
}

// ============================================================================
// 2. Decision Tree Regression (CART with SSE / Variance Reduction)
// ============================================================================

export interface TreeNode {
  isLeaf: boolean;
  value: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface DecisionTreeModel {
  root: TreeNode;
  featureImportances: FeatureImportanceItem[];
}

function buildCartTree(
  X: number[][],
  y: number[],
  indices: number[],
  depth: number,
  maxDepth: number,
  minSamplesSplit: number,
  minSamplesLeaf: number,
  featureSubsampleCount: number | null,
  rng: () => number,
  importanceAccum: number[]
): TreeNode {
  const n = indices.length;
  let sum = 0;
  let sumSq = 0;
  for (const idx of indices) {
    const v = y[idx];
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  const totalSse = Math.max(0, sumSq - (sum * sum) / n);

  if (depth >= maxDepth || n < minSamplesSplit || totalSse < 1e-8) {
    return { isLeaf: true, value: mean };
  }

  const numFeatures = X[0].length;
  let candidateFeatures: number[];
  if (featureSubsampleCount !== null && featureSubsampleCount < numFeatures) {
    const pool = Array.from({ length: numFeatures }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    candidateFeatures = pool.slice(0, featureSubsampleCount);
  } else {
    candidateFeatures = Array.from({ length: numFeatures }, (_, i) => i);
  }

  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;

  for (const f of candidateFeatures) {
    const pairs = indices.map((idx) => ({ val: X[idx][f], y: y[idx] }));
    pairs.sort((a, b) => a.val - b.val);

    let leftSum = 0;
    let leftSq = 0;
    let leftCount = 0;

    for (let i = 0; i < n - 1; i++) {
      const item = pairs[i];
      leftSum += item.y;
      leftSq += item.y * item.y;
      leftCount++;

      const nextVal = pairs[i + 1].val;
      if (Math.abs(nextVal - item.val) < 1e-10) continue;
      if (leftCount < minSamplesLeaf || n - leftCount < minSamplesLeaf) continue;

      const rightCount = n - leftCount;
      const rightSum = sum - leftSum;
      const rightSq = sumSq - leftSq;

      const leftSse = leftSq - (leftSum * leftSum) / leftCount;
      const rightSse = rightSq - (rightSum * rightSum) / rightCount;
      const gain = totalSse - (leftSse + rightSse);

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = (item.val + nextVal) / 2;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 1e-9) {
    return { isLeaf: true, value: mean };
  }

  importanceAccum[bestFeature] += bestGain;

  const leftIndices: number[] = [];
  const rightIndices: number[] = [];
  for (const idx of indices) {
    if (X[idx][bestFeature] <= bestThreshold) {
      leftIndices.push(idx);
    } else {
      rightIndices.push(idx);
    }
  }

  if (leftIndices.length === 0 || rightIndices.length === 0) {
    return { isLeaf: true, value: mean };
  }

  return {
    isLeaf: false,
    value: mean,
    featureIndex: bestFeature,
    threshold: bestThreshold,
    left: buildCartTree(
      X,
      y,
      leftIndices,
      depth + 1,
      maxDepth,
      minSamplesSplit,
      minSamplesLeaf,
      featureSubsampleCount,
      rng,
      importanceAccum
    ),
    right: buildCartTree(
      X,
      y,
      rightIndices,
      depth + 1,
      maxDepth,
      minSamplesSplit,
      minSamplesLeaf,
      featureSubsampleCount,
      rng,
      importanceAccum
    ),
  };
}

function predictTree(node: TreeNode, x: number[]): number {
  let cur = node;
  while (!cur.isLeaf && cur.featureIndex !== undefined && cur.threshold !== undefined) {
    if (x[cur.featureIndex] <= cur.threshold) {
      if (!cur.left) break;
      cur = cur.left;
    } else {
      if (!cur.right) break;
      cur = cur.right;
    }
  }
  return Math.max(0, cur.value);
}

export function trainDecisionTree(
  X: number[][],
  y: number[],
  featureNames: string[],
  maxDepth = 6
): DecisionTreeModel {
  const indices = Array.from({ length: X.length }, (_, i) => i);
  const importanceAccum = new Array<number>(featureNames.length).fill(0);
  const rng = createSeededRng(101);
  const root = buildCartTree(X, y, indices, 0, maxDepth, 6, 3, null, rng, importanceAccum);

  const totalImp = importanceAccum.reduce((a, b) => a + b, 0) || 1;
  const featureImportances = featureNames
    .map((feature, idx) => ({
      feature,
      importance: Number(((importanceAccum[idx] / totalImp) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.importance - a.importance);

  return { root, featureImportances };
}

// ============================================================================
// 3. Random Forest Regression (Bagging + Random Feature Subsampling)
// ============================================================================

export interface RandomForestModel {
  trees: TreeNode[];
  featureImportances: FeatureImportanceItem[];
}

export function trainRandomForest(
  X: number[][],
  y: number[],
  featureNames: string[],
  nTrees = 24,
  maxDepth = 8
): RandomForestModel {
  const n = X.length;
  const p = featureNames.length;
  // Standard regression forest subsampling (~60% of features) prevents starving dominant continuous predictors
  const mtry = Math.max(2, Math.ceil(p * 0.6));
  const rng = createSeededRng(4242);
  const importanceAccum = new Array<number>(p).fill(0);
  const trees: TreeNode[] = [];

  for (let t = 0; t < nTrees; t++) {
    const bootIndices = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      bootIndices[i] = Math.floor(rng() * n);
    }
    const tree = buildCartTree(X, y, bootIndices, 0, maxDepth, 5, 2, mtry, rng, importanceAccum);
    trees.push(tree);
  }

  const totalImp = importanceAccum.reduce((a, b) => a + b, 0) || 1;
  const featureImportances = featureNames
    .map((feature, idx) => ({
      feature,
      importance: Number(((importanceAccum[idx] / totalImp) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.importance - a.importance);

  return { trees, featureImportances };
}

export function predictRandomForest(model: RandomForestModel, x: number[]): number {
  if (model.trees.length === 0) return 0;
  let sum = 0;
  for (const tree of model.trees) {
    sum += predictTree(tree, x);
  }
  return Math.max(0, sum / model.trees.length);
}

// ============================================================================
// 4 & 5. Time-Series Models (Daily Aggregated Series)
// ============================================================================

export interface DailySeriesEntry {
  date: string;
  timestamp: number;
  sales: number;
}

export function buildDailySeries(records: SalesRecord[]): DailySeriesEntry[] {
  const map = new Map<string, { timestamp: number; sales: number }>();
  for (const r of records) {
    const cur = map.get(r.date) || { timestamp: r.timestamp, sales: 0 };
    cur.sales += r.sales;
    map.set(r.date, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      timestamp: v.timestamp,
      sales: Number(v.sales.toFixed(2)),
    }));
}

interface HoltSeasonalParams {
  alpha: number;
  beta: number;
  seasonalMultipliers: number[]; // length 7 (Sun..Sat)
  level: number;
  trend: number;
  residualStd: number;
}

function fitHoltSeasonal(series: DailySeriesEntry[]): HoltSeasonalParams {
  const n = series.length;
  const overallMean = series.reduce((a, b) => a + b.sales, 0) / Math.max(1, n);

  // Day-of-week seasonal multipliers
  const dowSums = new Array<number>(7).fill(0);
  const dowCounts = new Array<number>(7).fill(0);
  for (const pt of series) {
    const dow = new Date(pt.timestamp).getUTCDay();
    dowSums[dow] += pt.sales;
    dowCounts[dow] += 1;
  }
  const seasonalMultipliers = dowSums.map((s, dow) => {
    if (dowCounts[dow] === 0 || overallMean <= 1e-6) return 1;
    const ratio = s / dowCounts[dow] / overallMean;
    return Math.max(0.5, Math.min(1.8, ratio));
  });

  // Deseasonalized series
  const deseasonalized = series.map((pt) => {
    const dow = new Date(pt.timestamp).getUTCDay();
    return pt.sales / seasonalMultipliers[dow];
  });

  if (n < 4) {
    return {
      alpha: 0.3,
      beta: 0.05,
      seasonalMultipliers,
      level: deseasonalized[n - 1] || overallMean,
      trend: 0,
      residualStd: overallMean * 0.15,
    };
  }

  let bestAlpha = 0.3;
  let bestBeta = 0.05;
  let bestSse = Infinity;

  const alphas = [0.1, 0.2, 0.35, 0.5, 0.7];
  const betas = [0.01, 0.05, 0.1, 0.2];

  // Initial linear slope estimate from first quarter of series
  const initK = Math.min(n, Math.max(2, Math.floor(n * 0.25)));
  const initLevel = deseasonalized[0];
  const initTrend = (deseasonalized[initK - 1] - deseasonalized[0]) / Math.max(1, initK - 1);

  for (const alpha of alphas) {
    for (const beta of betas) {
      let level = initLevel;
      let trend = initTrend;
      let sse = 0;
      for (let t = 1; t < n; t++) {
        const forecastDeseas = level + trend;
        const dow = new Date(series[t].timestamp).getUTCDay();
        const forecast = Math.max(0, forecastDeseas * seasonalMultipliers[dow]);
        const err = series[t].sales - forecast;
        sse += err * err;

        const prevLevel = level;
        level = alpha * deseasonalized[t] + (1 - alpha) * (level + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
      }
      if (sse < bestSse) {
        bestSse = sse;
        bestAlpha = alpha;
        bestBeta = beta;
      }
    }
  }

  // Final pass with best parameters
  let level = initLevel;
  let trend = initTrend;
  let sse = 0;
  for (let t = 1; t < n; t++) {
    const dow = new Date(series[t].timestamp).getUTCDay();
    const forecast = Math.max(0, (level + trend) * seasonalMultipliers[dow]);
    const err = series[t].sales - forecast;
    sse += err * err;
    const prevLevel = level;
    level = bestAlpha * deseasonalized[t] + (1 - bestAlpha) * (level + trend);
    trend = bestBeta * (level - prevLevel) + (1 - bestBeta) * trend;
  }

  const residualStd = Math.sqrt(sse / Math.max(1, n - 1));

  return {
    alpha: bestAlpha,
    beta: bestBeta,
    seasonalMultipliers,
    level,
    trend,
    residualStd,
  };
}

// ============================================================================
// Full Training Bundle & Session Management
// ============================================================================

export interface TrainedBundle {
  sessionId: string;
  config: TrainingConfig;
  metadata: FeatureMetadata;
  linearModel: LinearRegressionModel;
  treeModel: DecisionTreeModel;
  forestModel: RandomForestModel;
  dailySeries: DailySeriesEntry[];
  holtParams: HoltSeasonalParams;
  summary: TrainingResult;
}

export function trainAllModels(
  records: SalesRecord[],
  config: TrainingConfig
): TrainedBundle {
  if (records.length < 12) {
    throw new Error('At least 12 cleaned sales records are required to train and evaluate ML models.');
  }

  // Ensure strict chronological order
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp || a.id - b.id);
  const splitRatio = Math.min(0.9, Math.max(0.5, config.splitRatio));
  const trainCount = Math.min(sorted.length - 3, Math.max(6, Math.floor(sorted.length * splitRatio)));
  const trainRecords = sorted.slice(0, trainCount);
  const testRecords = sorted.slice(trainCount);

  const meta = buildFeatureMetadata(sorted, trainRecords);
  const { X: XAll, y: yAll } = buildFeatureMatrix(sorted, meta);
  const XTrain = XAll.slice(0, trainCount);
  const yTrain = yAll.slice(0, trainCount);
  const XTest = XAll.slice(trainCount);
  const yTest = yAll.slice(trainCount);

  // 1. Train Linear Regression
  const t0 = performance.now();
  const linearModel = trainLinearRegression(XTrain, yTrain, meta.featureNames);
  const linearTime = Math.max(0.2, Number((performance.now() - t0).toFixed(2)));
  const linearTestPreds = XTest.map((row) => predictLinearRegression(linearModel, row));
  const linearMetrics = computeEvaluationMetrics(yTest, linearTestPreds);

  // 2. Train Decision Tree
  const t1 = performance.now();
  const treeModel = trainDecisionTree(XTrain, yTrain, meta.featureNames, config.treeMaxDepth);
  const treeTime = Math.max(0.2, Number((performance.now() - t1).toFixed(2)));
  const treeTestPreds = XTest.map((row) => predictTree(treeModel.root, row));
  const treeMetrics = computeEvaluationMetrics(yTest, treeTestPreds);

  // 3. Train Random Forest
  const t2 = performance.now();
  const forestModel = trainRandomForest(
    XTrain,
    yTrain,
    meta.featureNames,
    config.forestTrees,
    Math.min(10, config.treeMaxDepth + 1)
  );
  const forestTime = Math.max(0.2, Number((performance.now() - t2).toFixed(2)));
  const forestTestPreds = XTest.map((row) => predictRandomForest(forestModel, row));
  const forestMetrics = computeEvaluationMetrics(yTest, forestTestPreds);

  // Build TestPredictionPoint arrays
  const makeTestPoints = (preds: number[]): TestPredictionPoint[] =>
    testRecords.map((rec, idx) => ({
      index: idx + 1,
      date: rec.date,
      actual: Number(rec.sales.toFixed(2)),
      predicted: Number(preds[idx].toFixed(2)),
      residual: Number((rec.sales - preds[idx]).toFixed(2)),
      label: rec.product,
    }));

  // Time-series evaluation on daily aggregated series
  const dailySeries = buildDailySeries(sorted);
  const dailyTrainCount = Math.min(
    Math.max(4, dailySeries.length - 3),
    Math.max(4, Math.floor(dailySeries.length * splitRatio))
  );
  const dailyTrain = dailySeries.slice(0, dailyTrainCount);
  const dailyTest = dailySeries.slice(dailyTrainCount);

  // 4. Moving Average (Walk-forward causal window on daily series)
  const t3 = performance.now();
  const maWindow = Math.max(2, Math.min(30, config.movingAverageWindow));
  const maActuals: number[] = [];
  const maPreds: number[] = [];
  const maTestPoints: TestPredictionPoint[] = [];

  for (let i = 0; i < dailyTest.length; i++) {
    const absIdx = dailyTrainCount + i;
    const startIdx = Math.max(0, absIdx - maWindow);
    let sum = 0;
    let cnt = 0;
    for (let k = startIdx; k < absIdx; k++) {
      sum += dailySeries[k].sales;
      cnt++;
    }
    const pred = cnt > 0 ? sum / cnt : dailyTrain[dailyTrain.length - 1].sales;
    maActuals.push(dailyTest[i].sales);
    maPreds.push(pred);
    maTestPoints.push({
      index: i + 1,
      date: dailyTest[i].date,
      actual: Number(dailyTest[i].sales.toFixed(2)),
      predicted: Number(pred.toFixed(2)),
      residual: Number((dailyTest[i].sales - pred).toFixed(2)),
      label: dailyTest[i].date,
    });
  }
  const maTime = Math.max(0.1, Number((performance.now() - t3).toFixed(2)));
  const maMetrics = computeEvaluationMetrics(maActuals, maPreds);

  // 5. Historical Trend-Based Forecasting (Holt's Linear Trend + Day-of-Week Seasonality)
  const t4 = performance.now();
  const trainHolt = fitHoltSeasonal(dailyTrain);
  const trendActuals: number[] = [];
  const trendPreds: number[] = [];
  const trendTestPoints: TestPredictionPoint[] = [];

  let curLevel = trainHolt.level;
  let curTrend = trainHolt.trend;
  for (let i = 0; i < dailyTest.length; i++) {
    const pt = dailyTest[i];
    const dow = new Date(pt.timestamp).getUTCDay();
    const mult = trainHolt.seasonalMultipliers[dow];
    const pred = Math.max(0, (curLevel + curTrend) * mult);

    trendActuals.push(pt.sales);
    trendPreds.push(pred);
    trendTestPoints.push({
      index: i + 1,
      date: pt.date,
      actual: Number(pt.sales.toFixed(2)),
      predicted: Number(pred.toFixed(2)),
      residual: Number((pt.sales - pred).toFixed(2)),
      label: pt.date,
    });

    // Walk-forward causal update after observing day t
    const deseasonalizedObs = pt.sales / mult;
    const prevLevel = curLevel;
    curLevel = trainHolt.alpha * deseasonalizedObs + (1 - trainHolt.alpha) * (curLevel + curTrend);
    curTrend = trainHolt.beta * (curLevel - prevLevel) + (1 - trainHolt.beta) * curTrend;
  }
  const trendTime = Math.max(0.1, Number((performance.now() - t4).toFixed(2)));
  const trendMetrics = computeEvaluationMetrics(trendActuals, trendPreds);

  // Fit full-series Holt params for future forecasting
  const fullHolt = fitHoltSeasonal(dailySeries);

  const models: TrainedModelSummary[] = [
    {
      id: 'linear_regression',
      name: 'Linear Regression',
      kind: 'regression',
      metrics: linearMetrics,
      trainSamples: trainCount,
      testSamples: testRecords.length,
      trainingTimeMs: linearTime,
      featureImportances: linearModel.featureImportances,
      testPredictions: makeTestPoints(linearTestPreds),
      description:
        'Multivariate Ridge-regularized Ordinary Least Squares regression over temporal, cyclic seasonal, lag, and encoded product/region features.',
    },
    {
      id: 'decision_tree',
      name: 'Decision Tree Regression',
      kind: 'regression',
      metrics: treeMetrics,
      trainSamples: trainCount,
      testSamples: testRecords.length,
      trainingTimeMs: treeTime,
      featureImportances: treeModel.featureImportances,
      testPredictions: makeTestPoints(treeTestPreds),
      description: `CART binary regression tree (max depth ${config.treeMaxDepth}) minimizing variance / sum of squared errors at each split.`,
    },
    {
      id: 'random_forest',
      name: 'Random Forest Regression',
      kind: 'regression',
      metrics: forestMetrics,
      trainSamples: trainCount,
      testSamples: testRecords.length,
      trainingTimeMs: forestTime,
      featureImportances: forestModel.featureImportances,
      testPredictions: makeTestPoints(forestTestPreds),
      description: `Bagged ensemble of ${config.forestTrees} CART trees with random feature subsampling to reduce variance and overfitting.`,
    },
    {
      id: 'moving_average',
      name: 'Moving Average',
      kind: 'time_series',
      metrics: maMetrics,
      trainSamples: dailyTrainCount,
      testSamples: dailyTest.length,
      trainingTimeMs: maTime,
      featureImportances: [{ feature: `${maWindow}-Day Trailing Window`, importance: 100 }],
      testPredictions: maTestPoints,
      description: `Causal ${maWindow}-day Simple Moving Average evaluated walk-forward across the daily aggregated sales series.`,
    },
    {
      id: 'trend_forecast',
      name: 'Historical Trend Forecasting',
      kind: 'time_series',
      metrics: trendMetrics,
      trainSamples: dailyTrainCount,
      testSamples: dailyTest.length,
      trainingTimeMs: trendTime,
      featureImportances: [
        { feature: 'Exponential Level (α)', importance: 45 },
        { feature: 'Linear Trend Slope (β)', importance: 30 },
        { feature: 'Day-of-Week Seasonality', importance: 25 },
      ],
      testPredictions: trendTestPoints,
      description:
        "Holt's double exponential smoothing (level + linear trend) combined with multiplicative day-of-week seasonality.",
    },
  ];

  // Select best regression model by lowest RMSE (tie-break highest R²)
  const regressionModels = models.filter((m) => m.kind === 'regression');
  regressionModels.sort((a, b) => a.metrics.rmse - b.metrics.rmse || b.metrics.r2 - a.metrics.r2);
  const bestRegressionModelId = regressionModels[0].id as RegressionModelId;

  const allSorted = [...models].sort((a, b) => b.metrics.r2 - a.metrics.r2 || a.metrics.rmse - b.metrics.rmse);
  const bestOverallModelId = allSorted[0].id as ModelId;

  const sessionId = `ml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    sessionId,
    config,
    metadata: meta,
    linearModel,
    treeModel,
    forestModel,
    dailySeries,
    holtParams: fullHolt,
    summary: {
      sessionId,
      splitRatio,
      trainCount,
      testCount: testRecords.length,
      dailyTrainCount,
      dailyTestCount: dailyTest.length,
      dateRangeTrain: {
        start: trainRecords[0].date,
        end: trainRecords[trainRecords.length - 1].date,
      },
      dateRangeTest: {
        start: testRecords[0].date,
        end: testRecords[testRecords.length - 1].date,
      },
      bestRegressionModelId,
      bestOverallModelId,
      models,
      trainedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Single-Record Sales Prediction
// ============================================================================

export function predictSingleSale(
  bundle: TrainedBundle,
  input: PredictionInput
): PredictionOutput {
  const parts = input.date.split('-').map(Number);
  const ts =
    parts.length === 3 && !parts.some(Number.isNaN)
      ? Date.UTC(parts[0], parts[1] - 1, parts[2])
      : bundle.metadata.maxTimestamp;

  const hist = bundle.metadata.lastSalesHistory;
  const lag1 = hist.length > 0 ? hist[hist.length - 1] : bundle.metadata.globalTrainMean;
  const rolling7 =
    hist.length > 0
      ? hist.reduce((a, b) => a + b, 0) / hist.length
      : bundle.metadata.globalTrainMean;

  const x = extractRowFeatures(
    ts,
    input.product,
    input.category,
    input.region,
    input.quantity,
    input.unitPrice,
    lag1,
    rolling7,
    bundle.metadata
  );

  const linearPred = Number(predictLinearRegression(bundle.linearModel, x).toFixed(2));
  const treePred = Number(predictTree(bundle.treeModel.root, x).toFixed(2));
  const forestPred = Number(predictRandomForest(bundle.forestModel, x).toFixed(2));

  const mapPred: Record<RegressionModelId, { name: string; val: number }> = {
    linear_regression: { name: 'Linear Regression', val: linearPred },
    decision_tree: { name: 'Decision Tree Regression', val: treePred },
    random_forest: { name: 'Random Forest Regression', val: forestPred },
  };

  const chosen = mapPred[input.modelId];
  const historicalProductAvg = bundle.metadata.productMeans[input.product]
    ? Number(bundle.metadata.productMeans[input.product].toFixed(2))
    : null;

  return {
    modelId: input.modelId,
    modelName: chosen.name,
    predictedSales: chosen.val,
    baselineGross: Number((input.quantity * input.unitPrice).toFixed(2)),
    historicalProductAvg,
    allModelPredictions: [
      { modelId: 'linear_regression', modelName: 'Linear Regression', predictedSales: linearPred },
      { modelId: 'decision_tree', modelName: 'Decision Tree Regression', predictedSales: treePred },
      { modelId: 'random_forest', modelName: 'Random Forest Regression', predictedSales: forestPred },
    ],
    inputs: input,
  };
}

// ============================================================================
// Future Sales Forecasting
// ============================================================================

function addDaysIso(timestamp: number, days: number): { iso: string; timestamp: number } {
  const nextTs = timestamp + days * 86400000;
  const d = new Date(nextTs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return { iso: `${yyyy}-${mm}-${dd}`, timestamp: nextTs };
}

export function generateFutureForecast(
  bundle: TrainedBundle,
  method: ForecastMethodId,
  horizonDays: number
): ForecastResult {
  const H = Math.max(1, Math.min(365, Math.round(horizonDays)));
  const daily = bundle.dailySeries;
  const n = daily.length;
  const lastDay = daily[n - 1];

  // Show recent historical window alongside future forecast
  const historyDisplayCount = Math.min(n, Math.max(30, Math.min(90, H * 2)));
  const recentHistory = daily.slice(n - historyDisplayCount);

  const recentComparisonWindow = Math.min(n, H);
  const recentSlice = daily.slice(n - recentComparisonWindow);
  const recentHistoricalAvgDaily =
    recentSlice.reduce((a, b) => a + b.sales, 0) / Math.max(1, recentSlice.length);

  const methodNames: Record<ForecastMethodId, string> = {
    trend_forecast: 'Historical Trend Forecasting (Holt + Seasonality)',
    moving_average: `Moving Average (${bundle.config.movingAverageWindow}-Day + Seasonality)`,
    random_forest: 'Random Forest (Autoregressive Daily)',
    linear_regression: 'Linear Regression (Temporal Trend)',
  };

  const futurePoints: ForecastPoint[] = [];

  if (method === 'trend_forecast') {
    const { level, trend, seasonalMultipliers, residualStd } = bundle.holtParams;
    for (let h = 1; h <= H; h++) {
      const { iso, timestamp } = addDaysIso(lastDay.timestamp, h);
      const dow = new Date(timestamp).getUTCDay();
      const raw = Math.max(0, (level + h * trend) * seasonalMultipliers[dow]);
      const margin = 1.645 * residualStd * Math.sqrt(1 + (h - 1) * 0.05);
      futurePoints.push({
        date: iso,
        historicalSales: null,
        forecastSales: Number(raw.toFixed(2)),
        lowerBound: Number(Math.max(0, raw - margin).toFixed(2)),
        upperBound: Number((raw + margin).toFixed(2)),
        isFuture: true,
      });
    }
  } else if (method === 'moving_average') {
    const win = Math.max(2, Math.min(30, bundle.config.movingAverageWindow));
    const tail = daily.slice(Math.max(0, n - win));
    const deseasonalizedAvg =
      tail.reduce((acc, pt) => {
        const dow = new Date(pt.timestamp).getUTCDay();
        return acc + pt.sales / bundle.holtParams.seasonalMultipliers[dow];
      }, 0) / Math.max(1, tail.length);

    const std = Math.sqrt(
      tail.reduce((acc, pt) => acc + Math.pow(pt.sales - recentHistoricalAvgDaily, 2), 0) /
        Math.max(1, tail.length)
    );

    for (let h = 1; h <= H; h++) {
      const { iso, timestamp } = addDaysIso(lastDay.timestamp, h);
      const dow = new Date(timestamp).getUTCDay();
      const pred = Math.max(0, deseasonalizedAvg * bundle.holtParams.seasonalMultipliers[dow]);
      const margin = 1.645 * std * Math.sqrt(1 + (h - 1) * 0.03);
      futurePoints.push({
        date: iso,
        historicalSales: null,
        forecastSales: Number(pred.toFixed(2)),
        lowerBound: Number(Math.max(0, pred - margin).toFixed(2)),
        upperBound: Number((pred + margin).toFixed(2)),
        isFuture: true,
      });
    }
  } else {
    // Autoregressive daily forecast using daily-level Linear Regression or Random Forest
    const dailyNames = [
      'Day of Month',
      'Month (Sin)',
      'Month (Cos)',
      'Day of Week (Sin)',
      'Day of Week (Cos)',
      'Time Trend Index',
      'Lag-1 Daily Sales',
      'Rolling 7-Day Mean',
    ];
    const minTs = daily[0].timestamp;
    const span = Math.max(86400000, lastDay.timestamp - minTs);
    const globalDailyMean = daily.reduce((a, b) => a + b.sales, 0) / Math.max(1, n);

    const makeDailyVec = (ts: number, lag1: number, roll7: number): number[] => {
      const d = new Date(ts);
      const mAngle = (2 * Math.PI * (d.getUTCMonth() + 1)) / 12;
      const wAngle = (2 * Math.PI * d.getUTCDay()) / 7;
      return [
        d.getUTCDate(),
        Math.sin(mAngle),
        Math.cos(mAngle),
        Math.sin(wAngle),
        Math.cos(wAngle),
        (ts - minTs) / span,
        lag1,
        roll7,
      ];
    };

    const Xd: number[][] = [];
    const yd: number[] = [];
    for (let i = 0; i < n; i++) {
      const lag1 = i > 0 ? daily[i - 1].sales : globalDailyMean;
      let rs = 0;
      let rc = 0;
      for (let j = Math.max(0, i - 7); j < i; j++) {
        rs += daily[j].sales;
        rc++;
      }
      const r7 = rc > 0 ? rs / rc : globalDailyMean;
      Xd.push(makeDailyVec(daily[i].timestamp, lag1, r7));
      yd.push(daily[i].sales);
    }

    const dailyLr = method === 'linear_regression' ? trainLinearRegression(Xd, yd, dailyNames, 0.2) : null;
    const dailyRf = method === 'random_forest' ? trainRandomForest(Xd, yd, dailyNames, 20, 6) : null;

    const buffer = daily.slice(-7).map((d) => d.sales);
    const std = bundle.holtParams.residualStd;

    for (let h = 1; h <= H; h++) {
      const { iso, timestamp } = addDaysIso(lastDay.timestamp, h);
      const lag1 = buffer[buffer.length - 1] ?? globalDailyMean;
      const roll7 = buffer.slice(-7).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(7, buffer.length));
      const vec = makeDailyVec(timestamp, lag1, roll7);
      const pred = dailyLr
        ? predictLinearRegression(dailyLr, vec)
        : dailyRf
        ? predictRandomForest(dailyRf, vec)
        : globalDailyMean;

      buffer.push(pred);
      const margin = 1.645 * std * Math.sqrt(1 + (h - 1) * 0.04);
      futurePoints.push({
        date: iso,
        historicalSales: null,
        forecastSales: Number(pred.toFixed(2)),
        lowerBound: Number(Math.max(0, pred - margin).toFixed(2)),
        upperBound: Number((pred + margin).toFixed(2)),
        isFuture: true,
      });
    }
  }

  // Build combined chart series with a clean bridge at the last historical point
  const combinedPoints: ForecastPoint[] = recentHistory.map((pt, idx) => {
    const isLast = idx === recentHistory.length - 1;
    return {
      date: pt.date,
      historicalSales: pt.sales,
      forecastSales: isLast ? pt.sales : null,
      lowerBound: isLast ? pt.sales : null,
      upperBound: isLast ? pt.sales : null,
      isFuture: false,
    };
  });

  combinedPoints.push(...futurePoints);

  const totalForecastSales = futurePoints.reduce((acc, p) => acc + (p.forecastSales || 0), 0);
  const averageDailyForecast = totalForecastSales / H;
  const expectedGrowthPct =
    recentHistoricalAvgDaily > 1e-6
      ? ((averageDailyForecast - recentHistoricalAvgDaily) / recentHistoricalAvgDaily) * 100
      : 0;

  const trendDirection: 'up' | 'down' | 'flat' =
    expectedGrowthPct > 1 ? 'up' : expectedGrowthPct < -1 ? 'down' : 'flat';

  return {
    method,
    methodName: methodNames[method],
    horizonDays: H,
    totalForecastSales: Number(totalForecastSales.toFixed(2)),
    averageDailyForecast: Number(averageDailyForecast.toFixed(2)),
    recentHistoricalAvgDaily: Number(recentHistoricalAvgDaily.toFixed(2)),
    expectedGrowthPct: Number(expectedGrowthPct.toFixed(2)),
    trendDirection,
    points: combinedPoints,
  };
}
