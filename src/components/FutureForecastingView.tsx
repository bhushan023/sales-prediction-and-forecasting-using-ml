import {
  ArrowDownRight,
  ArrowUpRight,
  Cpu,
  Download,
  Loader2,
  Minus,
  Play,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsvFile, formatCurrency, formatPercent } from '../lib/formatters.ts';
import type {
  ForecastHorizonPreset,
  ForecastMethodId,
  ForecastResult,
  TrainingResult,
} from '../types/sales.ts';

interface FutureForecastingViewProps {
  trainingResult: TrainingResult | null;
  forecastResult: ForecastResult | null;
  isForecasting: boolean;
  forecastError: string | null;
  onRunForecast: (method: ForecastMethodId, horizonDays: number) => void;
  onTrainModels: () => void;
}

const HORIZON_OPTIONS: Array<{ id: ForecastHorizonPreset; label: string; days: number }> = [
  { id: '7d', label: 'Next 7 Days', days: 7 },
  { id: '15d', label: 'Next 15 Days', days: 15 },
  { id: '30d', label: 'Next 30 Days', days: 30 },
  { id: '90d', label: 'Next 3 Months', days: 90 },
  { id: 'custom', label: 'Custom Period', days: 45 },
];

export function FutureForecastingView({
  trainingResult,
  forecastResult,
  isForecasting,
  forecastError,
  onRunForecast,
  onTrainModels,
}: FutureForecastingViewProps) {
  const [preset, setPreset] = useState<ForecastHorizonPreset>('30d');
  const [customDays, setCustomDays] = useState<number>(45);
  const [method, setMethod] = useState<ForecastMethodId>('trend_forecast');

  const activeHorizonDays =
    preset === 'custom'
      ? Math.max(1, Math.min(365, customDays || 1))
      : HORIZON_OPTIONS.find((h) => h.id === preset)?.days || 30;

  useEffect(() => {
    if (trainingResult && !forecastResult && !isForecasting) {
      onRunForecast(method, activeHorizonDays);
    }
  }, [trainingResult?.sessionId]);

  const handlePresetClick = (nextPreset: ForecastHorizonPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') {
      const days = HORIZON_OPTIONS.find((h) => h.id === nextPreset)?.days || 30;
      onRunForecast(method, days);
    }
  };

  const handleMethodChange = (nextMethod: ForecastMethodId) => {
    setMethod(nextMethod);
    onRunForecast(nextMethod, activeHorizonDays);
  };

  const handleDownloadForecast = () => {
    if (!forecastResult) return;
    const futureRows = forecastResult.points.filter((p) => p.isFuture);
    const lines = [
      'Date,Predicted Sales,Lower Bound (90% CI),Upper Bound (90% CI)',
      ...futureRows.map(
        (r) =>
          `${r.date},${r.forecastSales ?? ''},${r.lowerBound ?? ''},${r.upperBound ?? ''}`
      ),
    ];
    downloadCsvFile(lines.join('\n'), `sales_forecast_${forecastResult.horizonDays}d.csv`);
  };

  if (!trainingResult) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Cpu className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Train Models Before Forecasting
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Future sales forecasting relies on fitted trend, seasonal, and regression parameters from your historical sales dataset.
        </p>
        <button
          type="button"
          onClick={onTrainModels}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Play className="h-4 w-4" />
          <span>Train ML Models Now</span>
        </button>
      </div>
    );
  }

  const futurePoints = forecastResult?.points.filter((p) => p.isFuture) || [];

  return (
    <div className="space-y-6">
      {/* Controls Panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Future Sales Forecasting</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Project daily future sales beyond the historical timeline using time-series trend, seasonality, or autoregressive ML models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={method}
              onChange={(e) => handleMethodChange(e.target.value as ForecastMethodId)}
              aria-label="Forecasting Algorithm"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="trend_forecast">Historical Trend Forecasting (Holt + Seasonality)</option>
              <option value="moving_average">Moving Average (Seasonal Adjusted)</option>
              <option value="random_forest">Random Forest (Autoregressive Daily)</option>
              <option value="linear_regression">Linear Regression (Temporal Trend)</option>
            </select>

            <button
              type="button"
              onClick={() => onRunForecast(method, activeHorizonDays)}
              disabled={isForecasting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
            >
              {isForecasting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Forecasting...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>Generate Forecast</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Horizon Period Presets */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-600">Forecasting Period:</span>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            {HORIZON_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePresetClick(opt.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  preset === opt.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={customDays}
                onChange={(e) =>
                  setCustomDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))
                }
                className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <span className="text-xs text-slate-500">days (1–365)</span>
              <button
                type="button"
                onClick={() => onRunForecast(method, activeHorizonDays)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {forecastError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
            {forecastError}
          </div>
        )}
      </section>

      {forecastResult && (
        <>
          {/* Forecast Summary KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">
                Total Predicted Sales ({forecastResult.horizonDays} Days)
              </p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatCurrency(forecastResult.totalForecastSales)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 truncate">{forecastResult.methodName}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Forecasted Daily Average</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatCurrency(forecastResult.averageDailyForecast)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">Projected mean daily revenue</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">
                Recent Historical Daily Avg ({forecastResult.horizonDays}D)
              </p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatCurrency(forecastResult.recentHistoricalAvgDaily)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">Prior matching baseline window</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Expected Sales Trajectory</p>
              <p
                className={`mt-2 text-2xl font-bold font-mono tabular-nums flex items-center gap-1.5 ${
                  forecastResult.trendDirection === 'up'
                    ? 'text-emerald-700'
                    : forecastResult.trendDirection === 'down'
                    ? 'text-red-700'
                    : 'text-slate-700'
                }`}
              >
                {forecastResult.trendDirection === 'up' && <ArrowUpRight className="h-5 w-5" />}
                {forecastResult.trendDirection === 'down' && <ArrowDownRight className="h-5 w-5" />}
                {forecastResult.trendDirection === 'flat' && <Minus className="h-5 w-5" />}
                {formatPercent(forecastResult.expectedGrowthPct)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                {forecastResult.trendDirection === 'up'
                  ? 'Projected revenue expansion'
                  : forecastResult.trendDirection === 'down'
                  ? 'Projected revenue contraction'
                  : 'Projected stable demand'}
              </p>
            </div>
          </section>

          {/* Historical vs Predicted Chart */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Historical Sales vs Predicted Future Sales
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Solid blue line shows actual historical daily sales; dashed emerald line indicates future predictions with confidence interval.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadForecast}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Forecast CSV</span>
              </button>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={forecastResult.points}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(Number(v), true)}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      String(name),
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    name="Upper Confidence Bound"
                    stroke="none"
                    fill="#10b981"
                    fillOpacity={0.1}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="historicalSales"
                    name="Historical Sales"
                    stroke="#1d4ed8"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecastSales"
                    name="Predicted Future Sales"
                    stroke="#059669"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Forecast Schedule Table */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-semibold text-slate-900">
              Daily Forecast Schedule ({futurePoints.length} Days)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Expected daily revenue and 90% confidence interval bounds
            </p>
            <div className="mt-4 overflow-x-auto max-h-80 border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">Forecast Date</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Lower Bound</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Predicted Sales</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Upper Bound</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {futurePoints.map((pt) => (
                    <tr key={pt.date} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono tabular-nums text-slate-800">{pt.date}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500">
                        {pt.lowerBound !== null ? formatCurrency(pt.lowerBound) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {pt.forecastSales !== null ? formatCurrency(pt.forecastSales) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500">
                        {pt.upperBound !== null ? formatCurrency(pt.upperBound) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
