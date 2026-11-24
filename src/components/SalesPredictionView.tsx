import { Cpu, Loader2, Play, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatCurrency, formatNumber } from '../lib/formatters.ts';
import type {
  EDASummary,
  PredictionInput,
  PredictionOutput,
  RegressionModelId,
  TrainingResult,
} from '../types/sales.ts';

interface SalesPredictionViewProps {
  eda: EDASummary | null;
  trainingResult: TrainingResult | null;
  isPredicting: boolean;
  predictionError: string | null;
  lastPrediction: PredictionOutput | null;
  onPredict: (input: PredictionInput) => void;
  onTrainModels: () => void;
}

export function SalesPredictionView({
  eda,
  trainingResult,
  isPredicting,
  predictionError,
  lastPrediction,
  onPredict,
  onTrainModels,
}: SalesPredictionViewProps) {
  const defaultProduct = eda?.uniqueProducts[0] || 'Enterprise Cloud Suite';
  const defaultProductInfo = eda?.productDefaults[defaultProduct];
  const defaultDate = eda?.dateRange.end || '2026-01-15';

  const [modelId, setModelId] = useState<RegressionModelId>(
    trainingResult?.bestRegressionModelId || 'random_forest'
  );
  const [date, setDate] = useState(defaultDate);
  const [product, setProduct] = useState(defaultProduct);
  const [category, setCategory] = useState(
    defaultProductInfo?.category || eda?.uniqueCategories[0] || 'Software'
  );
  const [region, setRegion] = useState(eda?.uniqueRegions[0] || 'North America');
  const [quantity, setQuantity] = useState<number>(5);
  const [unitPrice, setUnitPrice] = useState<number>(
    defaultProductInfo?.avgUnitPrice || 480
  );

  // Sync defaults when dataset or training result updates
  useEffect(() => {
    if (trainingResult) {
      setModelId(trainingResult.bestRegressionModelId);
    }
  }, [trainingResult?.sessionId]);

  useEffect(() => {
    if (eda && eda.uniqueProducts.length > 0) {
      const firstProd = eda.uniqueProducts[0];
      const info = eda.productDefaults[firstProd];
      setProduct(firstProd);
      if (info) {
        setCategory(info.category);
        setUnitPrice(info.avgUnitPrice);
      } else if (eda.uniqueCategories.length > 0) {
        setCategory(eda.uniqueCategories[0]);
      }
      if (eda.uniqueRegions.length > 0) {
        setRegion(eda.uniqueRegions[0]);
      }
      setDate(eda.dateRange.end);
    }
  }, [eda]);

  const handleProductChange = (nextProd: string) => {
    setProduct(nextProd);
    const info = eda?.productDefaults[nextProd];
    if (info) {
      setCategory(info.category);
      setUnitPrice(info.avgUnitPrice);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPredict({
      date,
      product,
      category,
      region,
      quantity: Math.max(1, Number(quantity) || 1),
      unitPrice: Math.max(0, Number(unitPrice) || 0),
      modelId,
    });
  };

  if (!eda) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Target className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">No Dataset Loaded</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload a sales dataset and train models before running order predictions.
        </p>
      </div>
    );
  }

  if (!trainingResult) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Cpu className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Models Must Be Trained First
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Train Linear Regression, Decision Tree, and Random Forest models on your dataset to enable real model-driven predictions.
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

  const selectedModelMeta = trainingResult.models.find((m) => m.id === modelId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-6 space-y-5 h-fit"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Order Sales Prediction</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter transaction parameters to run live inference on the trained ML model.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Machine Learning Model
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value as RegressionModelId)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="random_forest">
                Random Forest Regression
                {trainingResult.bestRegressionModelId === 'random_forest' ? ' (Best Model)' : ''}
              </option>
              <option value="decision_tree">
                Decision Tree Regression
                {trainingResult.bestRegressionModelId === 'decision_tree' ? ' (Best Model)' : ''}
              </option>
              <option value="linear_regression">
                Linear Regression
                {trainingResult.bestRegressionModelId === 'linear_regression' ? ' (Best Model)' : ''}
              </option>
            </select>
            {selectedModelMeta && (
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                Test R²: {selectedModelMeta.metrics.r2.toFixed(4)} · RMSE:{' '}
                {formatCurrency(selectedModelMeta.metrics.rmse)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Transaction Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Product</label>
            <select
              value={product}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {eda.uniqueProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                {eda.uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                {eda.uniqueRegions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Quantity (Units)</label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Unit Price ($)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>
        </div>

        {predictionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {predictionError}
          </div>
        )}

        <button
          type="submit"
          disabled={isPredicting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {isPredicting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Predicting...</span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              <span>Predict Sales Revenue</span>
            </>
          )}
        </button>
      </form>

      {/* Prediction Output Panel */}
      <div className="xl:col-span-3 space-y-6">
        {lastPrediction ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-blue-700">Trained Model Output</span>
                <span>{lastPrediction.modelName}</span>
              </div>

              <div>
                <p className="text-sm text-slate-600">Predicted Sales Revenue</p>
                <p className="mt-1 text-4xl font-bold font-mono tabular-nums text-slate-900">
                  {formatCurrency(lastPrediction.predictedSales)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Selected ML Model</p>
                  <p className="mt-1 font-semibold text-slate-900">{lastPrediction.modelName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Gross Baseline (Qty × Price)</p>
                  <p className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                    {formatCurrency(lastPrediction.baselineGross)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Historical Product Avg</p>
                  <p className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                    {lastPrediction.historicalProductAvg !== null
                      ? formatCurrency(lastPrediction.historicalProductAvg)
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </section>

            {/* Input Summary & Cross-Model Comparison */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-semibold text-slate-900">Input Parameters</h3>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Date</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {lastPrediction.inputs.date}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Product</dt>
                    <dd className="font-medium text-slate-900">{lastPrediction.inputs.product}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Category</dt>
                    <dd className="font-medium text-slate-900">{lastPrediction.inputs.category}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Region</dt>
                    <dd className="font-medium text-slate-900">{lastPrediction.inputs.region}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Quantity</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {formatNumber(lastPrediction.inputs.quantity)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Unit Price</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {formatCurrency(lastPrediction.inputs.unitPrice)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-semibold text-slate-900">
                  Cross-Model Prediction Comparison
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Predictions from all 3 trained regression models on these inputs
                </p>
                <div className="mt-4 space-y-3">
                  {lastPrediction.allModelPredictions.map((item) => {
                    const isSelected = item.modelId === lastPrediction.modelId;
                    return (
                      <div
                        key={item.modelId}
                        className={`rounded-lg border p-3.5 flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-300 bg-blue-50/50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.modelName}</p>
                          {isSelected && (
                            <p className="text-[11px] font-semibold text-blue-700">Selected</p>
                          )}
                        </div>
                        <p className="text-base font-bold font-mono tabular-nums text-slate-900">
                          {formatCurrency(item.predictedSales)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <Target className="mx-auto h-10 w-10 text-blue-600" />
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Configure Parameters &amp; Predict
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
              Adjust the Date, Product, Category, Region, Quantity, and Unit Price on the left, then click &ldquo;Predict Sales Revenue&rdquo; to compute an estimate using the trained model.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
