import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Cpu,
  Database,
  Play,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatNumber, formatPercent } from '../lib/formatters.ts';
import type { CleaningReport, EDASummary, TrainingResult } from '../types/sales.ts';
import type { NavSectionId } from './Sidebar.tsx';

interface HomeDashboardProps {
  datasetName: string;
  cleaningReport: CleaningReport | null;
  eda: EDASummary | null;
  trainingResult: TrainingResult | null;
  isTraining: boolean;
  onTrainModels: () => void;
  onNavigate: (section: NavSectionId) => void;
}

export function HomeDashboard({
  datasetName,
  cleaningReport,
  eda,
  trainingResult,
  isTraining,
  onTrainModels,
  onNavigate,
}: HomeDashboardProps) {
  if (!eda || !cleaningReport) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Database className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">No Sales Dataset Loaded</h2>
        <p className="mt-2 max-w-md mx-auto text-sm text-slate-600">
          Upload your own historical sales CSV file or load the sample dataset to start analyzing trends and training Machine Learning models.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
        >
          <Upload className="h-4 w-4" />
          <span>Go to Dataset Upload</span>
        </button>
      </div>
    );
  }

  const bestModel = trainingResult?.models.find(
    (m) => m.id === trainingResult.bestRegressionModelId
  );

  const growthPositive = (eda.latestMonthGrowthPct ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-blue-700">Executive Overview</span>
            <span aria-hidden="true">·</span>
            <span>{datasetName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {eda.dateRange.start} to {eda.dateRange.end}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales Prediction and Forecasting using ML
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Historical sales intelligence, automated data cleaning, regression modeling, and time-series demand forecasting across{' '}
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {formatNumber(eda.totalOrders)}
            </span>{' '}
            verified records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onTrainModels}
            disabled={isTraining}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Play className="h-4 w-4" />
            <span>{isTraining ? 'Training Models...' : trainingResult ? 'Retrain Models' : 'Train ML Models'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('forecasting')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <TrendingUp className="h-4 w-4 text-blue-700" />
            <span>View Forecast</span>
          </button>
        </div>
      </section>

      {/* Primary KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Sales Revenue</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(eda.totalRevenue)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {eda.latestMonthGrowthPct !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 font-medium font-mono tabular-nums ${
                  growthPositive ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {growthPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {formatPercent(eda.latestMonthGrowthPct)} MoM
              </span>
            ) : (
              <span className="text-slate-500">Single period</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Orders &amp; Units</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(eda.totalOrders)}
          </p>
          <p className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {formatNumber(eda.totalUnitsSold)} total units sold
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Average Order Value</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(eda.averageSales)}
          </p>
          <p className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Peak order: {formatCurrency(eda.highestSales.value)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Best ML Model (Test R²)</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {bestModel ? `${(bestModel.metrics.r2 * 100).toFixed(1)}%` : 'Not Trained'}
          </p>
          <p className="mt-2 text-xs text-slate-500 truncate">
            {bestModel
              ? `${bestModel.name} · RMSE ${formatCurrency(bestModel.metrics.rmse)}`
              : 'Click Train ML Models to evaluate'}
          </p>
        </div>
      </section>

      {/* Main Chart + Pipeline Quick Actions */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Monthly Revenue Trajectory</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated historical sales across {eda.monthlySales.length} months
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('visualization')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              <span>All Charts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eda.monthlySales} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), true)}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Monthly Sales']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#1d4ed8' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workflow Checklist / Shortcuts */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">ML Workflow Pipeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Navigate directly to any stage of the forecasting workflow
            </p>

            <div className="mt-5 divide-y divide-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Upload className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">1. Dataset &amp; Cleaning</span>
                    <span className="block text-xs text-slate-500 font-mono tabular-nums">
                      {cleaningReport.cleanedRows} clean · {cleaningReport.duplicatesRemoved} dupes removed
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('eda')}
                className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">2. Exploratory Data Analysis</span>
                    <span className="block text-xs text-slate-500">
                      {eda.uniqueProducts.length} products · {eda.uniqueRegions.length} regions
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('training')}
                className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Cpu className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">3. ML Model Training</span>
                    <span className="block text-xs text-slate-500">
                      {trainingResult
                        ? `${trainingResult.models.length} models trained (${Math.round(trainingResult.splitRatio * 100)}/${Math.round((1 - trainingResult.splitRatio) * 100)} split)`
                        : 'Pending training'}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('prediction')}
                className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">4. Sales Prediction</span>
                    <span className="block text-xs text-slate-500">
                      Interactive order revenue estimation
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('evaluation')}
                className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Award className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">5. Model Performance</span>
                    <span className="block text-xs text-slate-500">
                      MAE, MSE, RMSE, R², MAPE comparison
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Top Products & Trained Model Comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Top Revenue Products</h3>
            <button
              type="button"
              onClick={() => onNavigate('eda')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              Full Breakdown
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-left font-medium">Product</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Share</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eda.salesByProduct.slice(0, 6).map((p) => (
                  <tr key={p.name} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(p.orders)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {p.sharePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(p.sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Model Performance Summary</h3>
            <button
              type="button"
              onClick={() => onNavigate('evaluation')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              Detailed Metrics
            </button>
          </div>

          {trainingResult ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 text-left font-medium">Algorithm</th>
                    <th className="py-2 text-right font-medium">RMSE</th>
                    <th className="py-2 text-right font-medium">MAE</th>
                    <th className="py-2 text-right font-medium">R²</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trainingResult.models.map((m) => {
                    const isBest = m.id === trainingResult.bestRegressionModelId;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-medium text-slate-800">
                          {m.name}
                          {isBest && (
                            <span className="ml-2 text-xs font-semibold text-emerald-700">
                              (Best Regression)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(m.metrics.rmse)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                          {formatCurrency(m.metrics.mae)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {m.metrics.r2.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-600">
                Models have not been trained on the active dataset yet.
              </p>
              <button
                type="button"
                onClick={onTrainModels}
                disabled={isTraining}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Train All 5 Models</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
