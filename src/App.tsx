import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataAnalysisView } from './components/DataAnalysisView.tsx';
import { DatasetUploadView } from './components/DatasetUploadView.tsx';
import { FutureForecastingView } from './components/FutureForecastingView.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { ModelEvaluationView } from './components/ModelEvaluationView.tsx';
import { ModelTrainingView } from './components/ModelTrainingView.tsx';
import { ProjectInfoView } from './components/ProjectInfoView.tsx';
import { SalesPredictionView } from './components/SalesPredictionView.tsx';
import { SalesVisualizationView } from './components/SalesVisualizationView.tsx';
import { Sidebar, type NavSectionId } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { cleanAndTransformDataset, parseCsvString } from './lib/dataProcessor.ts';
import { computeEDASummary } from './lib/eda.ts';
import { generateSampleSalesCsv } from './lib/sampleData.ts';
import type {
  CleaningOptions,
  ColumnMapping,
  ForecastMethodId,
  ForecastResult,
  PredictionInput,
  PredictionOutput,
  RawCsvRow,
  SalesRecord,
  TrainingConfig,
  TrainingResult,
} from './types/sales.ts';

interface BannerNotification {
  type: 'success' | 'error';
  message: string;
}

const DEFAULT_MAPPING: ColumnMapping = {
  date: '',
  sales: '',
  product: '',
  category: '',
  quantity: '',
  unitPrice: '',
  region: '',
};

const DEFAULT_CLEANING_OPTIONS: CleaningOptions = {
  removeDuplicates: true,
  missingStrategy: 'impute',
};

const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  splitRatio: 0.8,
  treeMaxDepth: 6,
  forestTrees: 24,
  movingAverageWindow: 7,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [datasetName, setDatasetName] = useState('enterprise_sales_sample_2024_2025.csv');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>(DEFAULT_CLEANING_OPTIONS);

  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(DEFAULT_TRAINING_CONFIG);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  const [lastPrediction, setLastPrediction] = useState<PredictionOutput | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [banner, setBanner] = useState<BannerNotification | null>(null);

  const { records: cleanedRecords, report: cleaningReport } = useMemo(() => {
    if (headers.length === 0 || rawRows.length === 0) {
      return { records: [] as SalesRecord[], report: null };
    }
    return cleanAndTransformDataset(rawRows, headers, mapping, cleaningOptions);
  }, [rawRows, headers, mapping, cleaningOptions]);

  const eda = useMemo(() => computeEDASummary(cleanedRecords), [cleanedRecords]);

  const runTraining = useCallback(
    async (recordsToTrain: SalesRecord[], cfg: TrainingConfig, silent = false) => {
      if (recordsToTrain.length < 12) {
        setTrainingResult(null);
        setTrainingError(
          'At least 12 valid cleaned sales records are required to train ML models.'
        );
        return;
      }

      setIsTraining(true);
      setTrainingError(null);
      setLastPrediction(null);
      setForecastResult(null);

      try {
        const response = await fetch('/api/ml/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: recordsToTrain, config: cfg }),
        });

        const payload = (await response.json()) as {
          summary?: TrainingResult;
          error?: string;
        };

        if (!response.ok || !payload.summary) {
          throw new Error(payload.error || 'Model training request failed.');
        }

        setTrainingResult(payload.summary);
        if (!silent) {
          const best = payload.summary.models.find(
            (m) => m.id === payload.summary?.bestRegressionModelId
          );
          setBanner({
            type: 'success',
            message: `Trained 5 models on ${payload.summary.trainCount} chronological records. Best regression model: ${best?.name || 'Random Forest'} (R² ${best?.metrics.r2.toFixed(3) ?? ''}).`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unexpected training error.';
        setTrainingError(msg);
        if (!silent) {
          setBanner({ type: 'error', message: msg });
        }
      } finally {
        setIsTraining(false);
      }
    },
    []
  );

  const ingestCsvText = useCallback(
    (csvText: string, fileName: string, autoTrain = true, silent = false) => {
      const parsed = parseCsvString(csvText);
      setDatasetName(fileName);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(parsed.suggestedMapping);
      setParseErrors(parsed.errors);
      setTrainingResult(null);
      setLastPrediction(null);
      setForecastResult(null);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setBanner({
          type: 'error',
          message: parsed.errors[0] || 'Could not extract valid rows from CSV.',
        });
        return;
      }

      const cleaned = cleanAndTransformDataset(
        parsed.rows,
        parsed.headers,
        parsed.suggestedMapping,
        cleaningOptions
      );

      if (!silent) {
        setBanner({
          type: 'success',
          message: `Loaded ${fileName}: ${cleaned.records.length.toLocaleString()} valid records (${cleaned.report.duplicatesRemoved} duplicates removed, ${cleaned.report.missingValuesFound} missing cells detected).`,
        });
      }

      if (autoTrain && cleaned.records.length >= 12) {
        void runTraining(cleaned.records, trainingConfig, silent);
      }
    },
    [cleaningOptions, trainingConfig, runTraining]
  );

  const handleLoadSample = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch('/api/sample-dataset');
        if (res.ok) {
          const data = (await res.json()) as { csv: string; filename: string };
          ingestCsvText(data.csv, data.filename, true, silent);
          return;
        }
      } catch {
        // Fallback to local generator if API request fails
      }
      const csv = generateSampleSalesCsv();
      ingestCsvText(csv, 'enterprise_sales_sample_2024_2025.csv', true, silent);
    },
    [ingestCsvText]
  );

  // Initialize with the realistic sample dataset on first load
  useEffect(() => {
    void handleLoadSample(true);
  }, []);

  const handleUploadFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setBanner({
        type: 'error',
        message: 'Please select a valid .csv file.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      ingestCsvText(content, file.name, true, false);
    };
    reader.onerror = () => {
      setBanner({
        type: 'error',
        message: 'Failed to read the selected CSV file.',
      });
    };
    reader.readAsText(file);
  };

  const handleUpdateMapping = (nextMapping: ColumnMapping) => {
    setMapping(nextMapping);
    setTrainingResult(null);
    setLastPrediction(null);
    setForecastResult(null);
    const updated = cleanAndTransformDataset(rawRows, headers, nextMapping, cleaningOptions);
    if (updated.records.length >= 12) {
      void runTraining(updated.records, trainingConfig, true);
    }
  };

  const handleUpdateCleaningOptions = (nextOptions: CleaningOptions) => {
    setCleaningOptions(nextOptions);
    setTrainingResult(null);
    setLastPrediction(null);
    setForecastResult(null);
    const updated = cleanAndTransformDataset(rawRows, headers, mapping, nextOptions);
    if (updated.records.length >= 12) {
      void runTraining(updated.records, trainingConfig, true);
    }
  };

  const handlePredict = async (input: PredictionInput) => {
    setIsPredicting(true);
    setPredictionError(null);
    try {
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: trainingResult?.sessionId,
          input,
          records: cleanedRecords,
          config: trainingConfig,
        }),
      });
      const payload = (await response.json()) as {
        prediction?: PredictionOutput;
        error?: string;
      };
      if (!response.ok || !payload.prediction) {
        throw new Error(payload.error || 'Prediction failed.');
      }
      setLastPrediction(payload.prediction);
    } catch (err) {
      setPredictionError(err instanceof Error ? err.message : 'Prediction failed.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleRunForecast = async (method: ForecastMethodId, horizonDays: number) => {
    setIsForecasting(true);
    setForecastError(null);
    try {
      const response = await fetch('/api/ml/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: trainingResult?.sessionId,
          method,
          horizonDays,
          records: cleanedRecords,
          config: trainingConfig,
        }),
      });
      const payload = (await response.json()) as {
        forecast?: ForecastResult;
        error?: string;
      };
      if (!response.ok || !payload.forecast) {
        throw new Error(payload.error || 'Forecasting failed.');
      }
      setForecastResult(payload.forecast);
    } catch (err) {
      setForecastError(err instanceof Error ? err.message : 'Forecasting failed.');
    } finally {
      setIsForecasting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        hasTrainedModels={Boolean(trainingResult)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <TopBar
          activeSection={activeSection}
          datasetName={datasetName}
          cleanedCount={cleanedRecords.length}
          hasTrainedModels={Boolean(trainingResult)}
          isTraining={isTraining}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigateUpload={() => setActiveSection('upload')}
          onTrainModels={() => void runTraining(cleanedRecords, trainingConfig, false)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto space-y-6">
          {banner && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm ${
                banner.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {banner.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-700 shrink-0" />
                )}
                <span className="truncate">{banner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setBanner(null)}
                aria-label="Dismiss notification"
                className="p-1 rounded-md hover:bg-black/5 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {activeSection === 'home' && (
            <HomeDashboard
              datasetName={datasetName}
              cleaningReport={cleaningReport}
              eda={eda}
              trainingResult={trainingResult}
              isTraining={isTraining}
              onTrainModels={() => void runTraining(cleanedRecords, trainingConfig, false)}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'upload' && (
            <DatasetUploadView
              datasetName={datasetName}
              headers={headers}
              rawRows={rawRows}
              mapping={mapping}
              cleaningOptions={cleaningOptions}
              cleaningReport={cleaningReport}
              cleanedRecords={cleanedRecords}
              parseErrors={parseErrors}
              onUploadFile={handleUploadFile}
              onLoadSample={() => void handleLoadSample(false)}
              onUpdateMapping={handleUpdateMapping}
              onUpdateCleaningOptions={handleUpdateCleaningOptions}
            />
          )}

          {activeSection === 'eda' && (
            <DataAnalysisView
              eda={eda}
              onNavigateUpload={() => setActiveSection('upload')}
            />
          )}

          {activeSection === 'visualization' && (
            <SalesVisualizationView
              eda={eda}
              onNavigateUpload={() => setActiveSection('upload')}
            />
          )}

          {activeSection === 'training' && (
            <ModelTrainingView
              cleanedCount={cleanedRecords.length}
              config={trainingConfig}
              trainingResult={trainingResult}
              isTraining={isTraining}
              trainingError={trainingError}
              onUpdateConfig={setTrainingConfig}
              onTrain={() => void runTraining(cleanedRecords, trainingConfig, false)}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'prediction' && (
            <SalesPredictionView
              eda={eda}
              trainingResult={trainingResult}
              isPredicting={isPredicting}
              predictionError={predictionError}
              lastPrediction={lastPrediction}
              onPredict={handlePredict}
              onTrainModels={() => void runTraining(cleanedRecords, trainingConfig, false)}
            />
          )}

          {activeSection === 'forecasting' && (
            <FutureForecastingView
              trainingResult={trainingResult}
              forecastResult={forecastResult}
              isForecasting={isForecasting}
              forecastError={forecastError}
              onRunForecast={handleRunForecast}
              onTrainModels={() => void runTraining(cleanedRecords, trainingConfig, false)}
            />
          )}

          {activeSection === 'evaluation' && (
            <ModelEvaluationView
              trainingResult={trainingResult}
              onTrainModels={() => void runTraining(cleanedRecords, trainingConfig, false)}
            />
          )}

          {activeSection === 'documentation' && <ProjectInfoView />}
        </main>
      </div>
    </div>
  );
}
