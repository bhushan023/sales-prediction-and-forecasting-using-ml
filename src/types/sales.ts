export type RawCsvRow = Record<string, string>;

export interface ColumnMapping {
  date: string;
  sales: string;
  product: string;
  category: string;
  quantity: string;
  unitPrice: string;
  region: string;
}

export interface CleaningOptions {
  removeDuplicates: boolean;
  missingStrategy: 'impute' | 'drop';
}

export interface CleaningReport {
  rawRows: number;
  rawColumns: number;
  cleanedRows: number;
  duplicatesRemoved: number;
  missingValuesFound: number;
  missingByColumn: Record<string, number>;
  invalidDatesDropped: number;
  invalidSalesHandled: number;
  warnings: string[];
}

export interface SalesRecord {
  id: number;
  date: string; // YYYY-MM-DD
  timestamp: number;
  product: string;
  category: string;
  quantity: number;
  unitPrice: number;
  sales: number;
  region: string;
}

export interface AggregatedSegment {
  name: string;
  sales: number;
  orders: number;
  units: number;
  sharePct: number;
  avgOrderValue: number;
}

export interface DailySalesPoint {
  date: string;
  sales: number;
  orders: number;
  units: number;
}

export interface MonthlySalesPoint {
  monthKey: string; // YYYY-MM
  label: string;    // e.g. Jan 2024
  year: number;
  month: number;
  sales: number;
  orders: number;
  units: number;
  growthPct: number | null;
}

export interface YearlyComparisonPoint {
  monthIndex: number;
  monthName: string;
  [yearKey: string]: number | string;
}

export interface EDASummary {
  totalRevenue: number;
  totalOrders: number;
  totalUnitsSold: number;
  averageSales: number;
  highestSales: { value: number; date: string; product: string };
  lowestSales: { value: number; date: string; product: string };
  latestMonthGrowthPct: number | null;
  avgMonthlyGrowthPct: number | null;
  dateRange: { start: string; end: string };
  uniqueProducts: string[];
  uniqueCategories: string[];
  uniqueRegions: string[];
  productDefaults: Record<string, { category: string; avgUnitPrice: number; avgSales: number }>;
  dailySales: DailySalesPoint[];
  monthlySales: MonthlySalesPoint[];
  yearlyComparison: YearlyComparisonPoint[];
  years: number[];
  salesByProduct: AggregatedSegment[];
  salesByCategory: AggregatedSegment[];
  salesByRegion: AggregatedSegment[];
}

export type RegressionModelId = 'linear_regression' | 'decision_tree' | 'random_forest';
export type TimeSeriesModelId = 'moving_average' | 'trend_forecast';
export type ModelId = RegressionModelId | TimeSeriesModelId;
export type ForecastMethodId = 'trend_forecast' | 'moving_average' | 'random_forest' | 'linear_regression';

export interface EvaluationMetrics {
  mae: number;
  mse: number;
  rmse: number;
  r2: number;
  mape: number | null;
  validMapeCount: number;
}

export interface TestPredictionPoint {
  index: number;
  date: string;
  actual: number;
  predicted: number;
  residual: number;
  label: string;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface TrainedModelSummary {
  id: ModelId;
  name: string;
  kind: 'regression' | 'time_series';
  metrics: EvaluationMetrics;
  trainSamples: number;
  testSamples: number;
  trainingTimeMs: number;
  featureImportances: FeatureImportanceItem[];
  testPredictions: TestPredictionPoint[];
  description: string;
}

export interface TrainingConfig {
  splitRatio: number; // e.g., 0.8
  treeMaxDepth: number;
  forestTrees: number;
  movingAverageWindow: number;
}

export interface TrainingResult {
  sessionId: string;
  splitRatio: number;
  trainCount: number;
  testCount: number;
  dailyTrainCount: number;
  dailyTestCount: number;
  dateRangeTrain: { start: string; end: string };
  dateRangeTest: { start: string; end: string };
  bestRegressionModelId: RegressionModelId;
  bestOverallModelId: ModelId;
  models: TrainedModelSummary[];
  trainedAt: string;
}

export interface PredictionInput {
  date: string;
  product: string;
  category: string;
  region: string;
  quantity: number;
  unitPrice: number;
  modelId: RegressionModelId;
}

export interface PredictionOutput {
  modelId: RegressionModelId;
  modelName: string;
  predictedSales: number;
  baselineGross: number;
  historicalProductAvg: number | null;
  allModelPredictions: Array<{
    modelId: RegressionModelId;
    modelName: string;
    predictedSales: number;
  }>;
  inputs: PredictionInput;
}

export type ForecastHorizonPreset = '7d' | '15d' | '30d' | '90d' | 'custom';

export interface ForecastPoint {
  date: string;
  historicalSales: number | null;
  forecastSales: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  isFuture: boolean;
}

export interface ForecastResult {
  method: ForecastMethodId;
  methodName: string;
  horizonDays: number;
  totalForecastSales: number;
  averageDailyForecast: number;
  recentHistoricalAvgDaily: number;
  expectedGrowthPct: number;
  trendDirection: 'up' | 'down' | 'flat';
  points: ForecastPoint[];
}
