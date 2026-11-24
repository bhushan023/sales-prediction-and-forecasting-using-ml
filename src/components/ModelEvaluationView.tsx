import { Award, CheckCircle2, Cpu, Play } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatNumber } from '../lib/formatters.ts';
import type { ModelId, TrainingResult } from '../types/sales.ts';

interface ModelEvaluationViewProps {
  trainingResult: TrainingResult | null;
  onTrainModels: () => void;
}

export function ModelEvaluationView({
  trainingResult,
  onTrainModels,
}: ModelEvaluationViewProps) {
  const [inspectModelId, setInspectModelId] = useState<ModelId>('random_forest');

  if (!trainingResult) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Cpu className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          No Trained Models to Evaluate
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Train the Machine Learning and Time-Series models on your dataset to inspect real test-set MAE, MSE, RMSE, R², and MAPE scores.
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

  const bestReg = trainingResult.models.find(
    (m) => m.id === trainingResult.bestRegressionModelId
  );

  const errorComparisonData = trainingResult.models.map((m) => ({
    name: m.name.replace(' Regression', '').replace(' Forecasting', ''),
    RMSE: Number(m.metrics.rmse.toFixed(2)),
    MAE: Number(m.metrics.mae.toFixed(2)),
  }));

  const r2ComparisonData = trainingResult.models.map((m) => ({
    name: m.name.replace(' Regression', '').replace(' Forecasting', ''),
    R2: Number(m.metrics.r2.toFixed(4)),
  }));

  const inspectedModel =
    trainingResult.models.find((m) => m.id === inspectModelId) || trainingResult.models[0];

  return (
    <div className="space-y-6">
      {/* Winner Summary Banner */}
      {bestReg && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Award className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-emerald-800">
                Best Performing Regression Model (Holdout Test Set)
              </p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{bestReg.name}</h2>
              <p className="text-xs text-slate-600 mt-1">
                Selected automatically by lowest Root Mean Squared Error across{' '}
                <span className="font-mono tabular-nums font-medium">
                  {formatNumber(bestReg.testSamples)}
                </span>{' '}
                chronological test observations ({trainingResult.dateRangeTest.start} to{' '}
                {trainingResult.dateRangeTest.end}).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono tabular-nums shrink-0">
            <div>
              <span className="block text-xs text-slate-500">Test R² Score</span>
              <span className="text-lg font-bold text-slate-900">
                {bestReg.metrics.r2.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">RMSE</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(bestReg.metrics.rmse)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">MAE</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(bestReg.metrics.mae)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">MAPE</span>
              <span className="text-lg font-bold text-slate-900">
                {bestReg.metrics.mape !== null ? `${bestReg.metrics.mape.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Full Metrics Comparison Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Model Performance Evaluation Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All metrics are computed strictly from actual out-of-sample test predictions. Note: Regression models evaluate order-level predictions; Time-Series models evaluate daily aggregated sales.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Model Name</th>
                <th className="px-4 py-3 text-left font-semibold">Task Type</th>
                <th className="px-4 py-3 text-right font-semibold">MAE</th>
                <th className="px-4 py-3 text-right font-semibold">MSE</th>
                <th className="px-4 py-3 text-right font-semibold">RMSE</th>
                <th className="px-4 py-3 text-right font-semibold">R² Score</th>
                <th className="px-4 py-3 text-right font-semibold">MAPE</th>
                <th className="px-4 py-3 text-right font-semibold">Test N</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trainingResult.models.map((m) => {
                const isBest = m.id === trainingResult.bestRegressionModelId;
                return (
                  <tr
                    key={m.id}
                    className={isBest ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span>{m.name}</span>
                        {isBest && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Best Regression
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {m.kind === 'regression' ? 'Order Regression' : 'Daily Time-Series'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                      {formatCurrency(m.metrics.mae)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(m.metrics.mse, 2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(m.metrics.rmse)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                      {m.metrics.r2.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {m.metrics.mape !== null ? `${m.metrics.mape.toFixed(2)}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(m.testSamples)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comparison Charts: RMSE/MAE and R² */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Error Metrics Comparison (Lower is Better)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            RMSE and MAE across all evaluated models
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorComparisonData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), true)}
                />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="RMSE" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="MAE" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            R² Coefficient of Determination (Higher is Better)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Proportion of test-set variance explained (1.00 = perfect fit)
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r2ComparisonData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} tickLine={false} />
                <YAxis
                  domain={['auto', 1]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => Number(v).toFixed(4)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="R2" name="R² Score" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Actual vs Predicted Test Set Plot */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Actual vs Predicted Values on Test Set
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspecting out-of-sample alignment for {inspectedModel.name} (showing up to 100 latest test points)
            </p>
          </div>

          <select
            value={inspectedModel.id}
            onChange={(e) => setInspectModelId(e.target.value as ModelId)}
            aria-label="Inspect model test predictions"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          >
            {trainingResult.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={inspectedModel.testPredictions.slice(-100)}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
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
                formatter={(v, name) => [formatCurrency(Number(v)), String(name)]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Sales"
                stroke="#0f172a"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted Sales"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
