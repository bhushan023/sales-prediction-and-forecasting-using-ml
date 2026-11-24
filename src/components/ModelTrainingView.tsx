import { ArrowRight, CheckCircle2, Cpu, Loader2, Play } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatNumber } from '../lib/formatters.ts';
import type { RegressionModelId, TrainingConfig, TrainingResult } from '../types/sales.ts';
import type { NavSectionId } from './Sidebar.tsx';

interface ModelTrainingViewProps {
  cleanedCount: number;
  config: TrainingConfig;
  trainingResult: TrainingResult | null;
  isTraining: boolean;
  trainingError: string | null;
  onUpdateConfig: (next: TrainingConfig) => void;
  onTrain: () => void;
  onNavigate: (section: NavSectionId) => void;
}

export function ModelTrainingView({
  cleanedCount,
  config,
  trainingResult,
  isTraining,
  trainingError,
  onUpdateConfig,
  onTrain,
  onNavigate,
}: ModelTrainingViewProps) {
  const [selectedFeatureModel, setSelectedFeatureModel] =
    useState<RegressionModelId>('random_forest');

  const activeFeatureSummary = trainingResult?.models.find(
    (m) => m.id === selectedFeatureModel
  );

  return (
    <div className="space-y-6">
      {/* Training Configuration Panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Machine Learning Pipeline &amp; Chronological Training
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Trains 3 supervised regression models (Linear Regression, Decision Tree, Random Forest) and 2 time-series forecasting models (Moving Average, Historical Trend Forecasting) using strictly chronological train-test splitting to prevent data leakage.
            </p>
          </div>

          <button
            type="button"
            onClick={onTrain}
            disabled={isTraining || cleanedCount < 12}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            {isTraining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Training Models...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>{trainingResult ? 'Retrain All 5 Models' : 'Train All 5 Models'}</span>
              </>
            )}
          </button>
        </div>

        {trainingError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {trainingError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Chronological Train / Test Split
            </label>
            <select
              value={String(config.splitRatio)}
              onChange={(e) =>
                onUpdateConfig({ ...config, splitRatio: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="0.7">70% Train / 30% Test</option>
              <option value="0.75">75% Train / 25% Test</option>
              <option value="0.8">80% Train / 20% Test (Standard)</option>
              <option value="0.85">85% Train / 15% Test</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Earlier dates train; latest dates test.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Decision Tree Max Depth:{' '}
              <span className="font-mono tabular-nums text-blue-700">{config.treeMaxDepth}</span>
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={config.treeMaxDepth}
              onChange={(e) =>
                onUpdateConfig({ ...config, treeMaxDepth: Number(e.target.value) })
              }
              className="w-full accent-blue-700"
            />
            <p className="text-[11px] text-slate-500">
              Controls tree complexity (3–10 levels).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Random Forest Estimators:{' '}
              <span className="font-mono tabular-nums text-blue-700">{config.forestTrees} trees</span>
            </label>
            <input
              type="range"
              min={10}
              max={50}
              step={2}
              value={config.forestTrees}
              onChange={(e) =>
                onUpdateConfig({ ...config, forestTrees: Number(e.target.value) })
              }
              className="w-full accent-blue-700"
            />
            <p className="text-[11px] text-slate-500">
              Number of bagged regression trees.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Moving Average Window:{' '}
              <span className="font-mono tabular-nums text-blue-700">
                {config.movingAverageWindow} days
              </span>
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={config.movingAverageWindow}
              onChange={(e) =>
                onUpdateConfig({ ...config, movingAverageWindow: Number(e.target.value) })
              }
              className="w-full accent-blue-700"
            />
            <p className="text-[11px] text-slate-500">
              Trailing window for daily time-series MA.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Engineering Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900">
          Automated Feature Engineering Pipeline
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Features extracted strictly causally from historical sales records prior to training
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-semibold text-slate-900">Temporal &amp; Cyclic Features</p>
            <p className="mt-1 text-xs text-slate-600">
              Day of month, cyclic month encoding (sin/cos), cyclic day-of-week encoding (sin/cos), and normalized chronological time index.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-semibold text-slate-900">Autoregressive Lag Features</p>
            <p className="mt-1 text-xs text-slate-600">
              Causal Lag-1 previous order revenue and trailing 7-period rolling mean sales computed without peeking at future values.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-semibold text-slate-900">Commercial &amp; Encoded Signals</p>
            <p className="mt-1 text-xs text-slate-600">
              Order quantity, unit price, gross value, plus smoothed target encoding for Product, Category, and Region learned solely on the training split.
            </p>
          </div>
        </div>
      </section>

      {/* Training Results */}
      {trainingResult ? (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Training Samples (Chronological)</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatNumber(trainingResult.trainCount)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
                {trainingResult.dateRangeTrain.start} → {trainingResult.dateRangeTrain.end}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Testing Samples (Holdout)</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatNumber(trainingResult.testCount)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
                {trainingResult.dateRangeTest.start} → {trainingResult.dateRangeTest.end}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Best Regression Model</p>
              <p className="mt-2 text-lg font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="truncate">
                  {trainingResult.models.find((m) => m.id === trainingResult.bestRegressionModelId)?.name}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-slate-500">Selected via lowest test RMSE</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Next Actions</p>
                <p className="mt-1.5 text-xs text-slate-600">
                  Models are trained and ready for predictions and forecasting.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('prediction')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  <span>Predict</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onNavigate('evaluation')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  <span>Full Evaluation</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>

          {/* Feature Importance + Model Status Table */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Feature Importance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Relative feature contribution learned during training (%)
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                  {(
                    [
                      { id: 'linear_regression', label: 'Linear' },
                      { id: 'decision_tree', label: 'Tree' },
                      { id: 'random_forest', label: 'Forest' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedFeatureModel(item.id)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        selectedFeatureModel === item.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(activeFeatureSummary?.featureImportances || []).slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 4, right: 20, left: 20, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      width={150}
                      tick={{ fontSize: 11, fill: '#334155' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Importance']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Bar dataKey="importance" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-slate-900">Trained Models Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick test-set accuracy snapshot across all 5 algorithms
              </p>

              <div className="mt-4 space-y-3">
                {trainingResult.models.map((m) => {
                  const isBest = m.id === trainingResult.bestRegressionModelId;
                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{m.name}</span>
                          {isBest && (
                            <span className="text-xs font-semibold text-emerald-700">
                              Best Regression
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right font-mono tabular-nums text-xs">
                        <div>
                          <span className="block text-slate-400">RMSE</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(m.metrics.rmse)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">R²</span>
                          <span className="font-semibold text-slate-900">
                            {m.metrics.r2.toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Time</span>
                          <span className="text-slate-700">{m.trainingTimeMs}ms</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Cpu className="mx-auto h-10 w-10 text-blue-600" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">Ready to Train Models</h3>
          <p className="mt-1 text-sm text-slate-600">
            Click &ldquo;Train All 5 Models&rdquo; above to fit Linear Regression, Decision Tree, Random Forest, Moving Average, and Historical Trend Forecasting on your dataset.
          </p>
        </div>
      )}
    </div>
  );
}
