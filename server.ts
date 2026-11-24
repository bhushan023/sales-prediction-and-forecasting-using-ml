import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { generateSampleSalesCsv } from './src/lib/sampleData.ts';
import {
  generateFutureForecast,
  predictSingleSale,
  trainAllModels,
  type TrainedBundle,
} from './src/lib/mlEngine.ts';
import type {
  ForecastMethodId,
  PredictionInput,
  SalesRecord,
  TrainingConfig,
} from './src/types/sales.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Bounded in-memory store for trained ML model sessions
const SESSION_LIMIT = 20;
const sessionStore = new Map<string, { bundle: TrainedBundle; records: SalesRecord[] }>();

function storeSession(sessionId: string, bundle: TrainedBundle, records: SalesRecord[]) {
  if (sessionStore.size >= SESSION_LIMIT) {
    const oldestKey = sessionStore.keys().next().value;
    if (oldestKey) sessionStore.delete(oldestKey);
  }
  sessionStore.set(sessionId, { bundle, records });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/sample-dataset', (_req, res) => {
    try {
      const csv = generateSampleSalesCsv();
      res.json({ csv, filename: 'enterprise_sales_sample_2024_2025.csv' });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate sample dataset.' });
    }
  });

  app.post('/api/ml/train', (req, res) => {
    try {
      const { records, config } = req.body as {
        records?: SalesRecord[];
        config?: TrainingConfig;
      };

      if (!Array.isArray(records) || records.length < 12) {
        res.status(400).json({
          error: 'At least 12 valid cleaned sales records are required to train ML models.',
        });
        return;
      }

      const safeConfig: TrainingConfig = {
        splitRatio: Number(config?.splitRatio) || 0.8,
        treeMaxDepth: Number(config?.treeMaxDepth) || 6,
        forestTrees: Number(config?.forestTrees) || 24,
        movingAverageWindow: Number(config?.movingAverageWindow) || 7,
      };

      const bundle = trainAllModels(records, safeConfig);
      storeSession(bundle.sessionId, bundle, records);

      res.json({ summary: bundle.summary });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Model training failed.',
      });
    }
  });

  app.post('/api/ml/predict', (req, res) => {
    try {
      const { sessionId, input, records, config } = req.body as {
        sessionId?: string;
        input?: PredictionInput;
        records?: SalesRecord[];
        config?: TrainingConfig;
      };

      if (!input || !input.date || !input.modelId) {
        res.status(400).json({ error: 'Invalid prediction input payload.' });
        return;
      }

      let entry = sessionId ? sessionStore.get(sessionId) : undefined;
      if (!entry && Array.isArray(records) && records.length >= 12) {
        const safeConfig: TrainingConfig = {
          splitRatio: Number(config?.splitRatio) || 0.8,
          treeMaxDepth: Number(config?.treeMaxDepth) || 6,
          forestTrees: Number(config?.forestTrees) || 24,
          movingAverageWindow: Number(config?.movingAverageWindow) || 7,
        };
        const rebuilt = trainAllModels(records, safeConfig);
        storeSession(rebuilt.sessionId, rebuilt, records);
        entry = { bundle: rebuilt, records };
      }

      if (!entry) {
        res.status(404).json({
          error: 'No trained model session found. Please train the ML models first.',
        });
        return;
      }

      const prediction = predictSingleSale(entry.bundle, input);
      res.json({ prediction, sessionId: entry.bundle.sessionId });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Prediction failed.',
      });
    }
  });

  app.post('/api/ml/forecast', (req, res) => {
    try {
      const { sessionId, method, horizonDays, records, config } = req.body as {
        sessionId?: string;
        method?: ForecastMethodId;
        horizonDays?: number;
        records?: SalesRecord[];
        config?: TrainingConfig;
      };

      if (!method || !horizonDays || horizonDays < 1 || horizonDays > 365) {
        res.status(400).json({
          error: 'Forecast method and valid horizonDays (1–365) are required.',
        });
        return;
      }

      let entry = sessionId ? sessionStore.get(sessionId) : undefined;
      if (!entry && Array.isArray(records) && records.length >= 12) {
        const safeConfig: TrainingConfig = {
          splitRatio: Number(config?.splitRatio) || 0.8,
          treeMaxDepth: Number(config?.treeMaxDepth) || 6,
          forestTrees: Number(config?.forestTrees) || 24,
          movingAverageWindow: Number(config?.movingAverageWindow) || 7,
        };
        const rebuilt = trainAllModels(records, safeConfig);
        storeSession(rebuilt.sessionId, rebuilt, records);
        entry = { bundle: rebuilt, records };
      }

      if (!entry) {
        res.status(404).json({
          error: 'No trained model session found. Please train the ML models first.',
        });
        return;
      }

      const forecast = generateFutureForecast(entry.bundle, method, horizonDays);
      res.json({ forecast, sessionId: entry.bundle.sessionId });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Forecasting failed.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
