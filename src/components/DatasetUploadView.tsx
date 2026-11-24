import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Search,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { exportRecordsToCsv } from '../lib/dataProcessor.ts';
import { downloadCsvFile, formatCurrency, formatNumber } from '../lib/formatters.ts';
import type {
  CleaningOptions,
  CleaningReport,
  ColumnMapping,
  RawCsvRow,
  SalesRecord,
} from '../types/sales.ts';

interface DatasetUploadViewProps {
  datasetName: string;
  headers: string[];
  rawRows: RawCsvRow[];
  mapping: ColumnMapping;
  cleaningOptions: CleaningOptions;
  cleaningReport: CleaningReport | null;
  cleanedRecords: SalesRecord[];
  parseErrors: string[];
  onUploadFile: (file: File) => void;
  onLoadSample: () => void;
  onUpdateMapping: (next: ColumnMapping) => void;
  onUpdateCleaningOptions: (next: CleaningOptions) => void;
}

const MAPPING_FIELDS: Array<{
  key: keyof ColumnMapping;
  label: string;
  required?: boolean;
  hint: string;
}> = [
  { key: 'date', label: 'Date Column', required: true, hint: 'Transaction or order date' },
  { key: 'sales', label: 'Sales / Revenue Column', required: true, hint: 'Or derived from Qty × Price' },
  { key: 'product', label: 'Product Column', hint: 'Item or SKU name' },
  { key: 'category', label: 'Category Column', hint: 'Product line or department' },
  { key: 'quantity', label: 'Quantity Column', hint: 'Units ordered' },
  { key: 'unitPrice', label: 'Unit Price Column', hint: 'Price per unit' },
  { key: 'region', label: 'Region Column', hint: 'Geographic market or store' },
];

export function DatasetUploadView({
  datasetName,
  headers,
  rawRows,
  mapping,
  cleaningOptions,
  cleaningReport,
  cleanedRecords,
  parseErrors,
  onUploadFile,
  onLoadSample,
  onUpdateMapping,
  onUpdateCleaningOptions,
}: DatasetUploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tableTab, setTableTab] = useState<'cleaned' | 'raw'>('cleaned');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      setPage(1);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
      setPage(1);
    }
  };

  const filteredCleaned = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cleanedRecords;
    return cleanedRecords.filter(
      (r) =>
        r.date.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
    );
  }, [cleanedRecords, searchQuery]);

  const filteredRaw = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rawRows;
    return rawRows.filter((row) =>
      headers.some((h) => (row[h] || '').toLowerCase().includes(q))
    );
  }, [rawRows, headers, searchQuery]);

  const activeTotal = tableTab === 'cleaned' ? filteredCleaned.length : filteredRaw.length;
  const totalPages = Math.max(1, Math.ceil(activeTotal / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;

  const pagedCleaned = filteredCleaned.slice(startIdx, startIdx + pageSize);
  const pagedRaw = filteredRaw.slice(startIdx, startIdx + pageSize);

  const handleDownloadCleaned = () => {
    if (cleanedRecords.length === 0) return;
    const csv = exportRecordsToCsv(cleanedRecords);
    const baseName = datasetName.replace(/\.csv$/i, '');
    downloadCsvFile(csv, `${baseName}_cleaned.csv`);
  };

  const missingColumnsList = useMemo(() => {
    if (!cleaningReport) return [];
    return Object.entries(cleaningReport.missingByColumn).filter(([, count]) => count > 0);
  }, [cleaningReport]);

  return (
    <div className="space-y-6">
      {/* Upload & Sample Loader */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`lg:col-span-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-600 bg-blue-50/70'
              : 'border-slate-300 bg-white hover:border-blue-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Upload className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            Upload Historical Sales Dataset (CSV)
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-lg mx-auto">
            Drag and drop a <span className="font-mono">.csv</span> file here, or browse from your computer. Supports custom column names via interactive mapping below.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Select CSV File</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onLoadSample();
                setPage(1);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Database className="h-4 w-4 text-blue-700" />
              <span>Load Sample Dataset</span>
            </button>
          </div>
        </div>

        {/* Dataset Quality Audit */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Dataset Health &amp; Audit</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{datasetName}</p>

            {cleaningReport ? (
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Raw Rows × Columns</dt>
                  <dd className="font-mono tabular-nums font-semibold text-slate-900">
                    {formatNumber(cleaningReport.rawRows)} × {cleaningReport.rawColumns}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Valid Cleaned Rows</dt>
                  <dd className="font-mono tabular-nums font-semibold text-emerald-700">
                    {formatNumber(cleaningReport.cleanedRows)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Missing Values Detected</dt>
                  <dd
                    className={`font-mono tabular-nums font-semibold ${
                      cleaningReport.missingValuesFound > 0 ? 'text-amber-700' : 'text-slate-700'
                    }`}
                  >
                    {formatNumber(cleaningReport.missingValuesFound)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Duplicate Records Removed</dt>
                  <dd className="font-mono tabular-nums font-semibold text-slate-700">
                    {formatNumber(cleaningReport.duplicatesRemoved)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Invalid Dates Dropped</dt>
                  <dd className="font-mono tabular-nums font-semibold text-slate-700">
                    {formatNumber(cleaningReport.invalidDatesDropped)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No dataset loaded yet.</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadCleaned}
            disabled={cleanedRecords.length === 0}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Cleaned CSV</span>
          </button>
        </div>
      </section>

      {/* Errors / Warnings */}
      {(parseErrors.length > 0 || (cleaningReport && cleaningReport.warnings.length > 0)) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>Dataset Notices</span>
          </div>
          <ul className="list-disc pl-6 text-xs text-amber-800 space-y-1">
            {parseErrors.map((err, i) => (
              <li key={`pe-${i}`}>{err}</li>
            ))}
            {cleaningReport?.warnings.map((w, i) => (
              <li key={`cw-${i}`}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Column Mapping & Preprocessing Controls */}
      {headers.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Schema Mapping &amp; Preprocessing Rules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Map your CSV headers to standard sales attributes. Changes re-clean and update all analytics immediately.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleaningOptions.removeDuplicates}
                  onChange={(e) =>
                    onUpdateCleaningOptions({
                      ...cleaningOptions,
                      removeDuplicates: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>Remove Exact Duplicates</span>
              </label>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCleaningOptions({ ...cleaningOptions, missingStrategy: 'impute' })
                  }
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    cleaningOptions.missingStrategy === 'impute'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Impute Missing
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCleaningOptions({ ...cleaningOptions, missingStrategy: 'drop' })
                  }
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    cleaningOptions.missingStrategy === 'drop'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Drop Incomplete
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MAPPING_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-600 ml-0.5">*</span>}
                </label>
                <select
                  value={mapping[field.key]}
                  onChange={(e) =>
                    onUpdateMapping({ ...mapping, [field.key]: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="">-- Not Mapped --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">{field.hint}</p>
              </div>
            ))}
          </div>

          {missingColumnsList.length > 0 && (
            <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Missing cells handled by column:
              </span>
              {missingColumnsList.map(([col, cnt]) => (
                <span key={col} className="font-mono tabular-nums">
                  {col}: {cnt}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Dataset Preview Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTableTab('cleaned');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  tableTab === 'cleaned'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cleaned Dataset ({formatNumber(cleanedRecords.length)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTableTab('raw');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  tableTab === 'raw'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Raw CSV ({formatNumber(rawRows.length)})
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Filter records..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          {tableTab === 'cleaned' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Product</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Category</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Region</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Unit Price</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedCleaned.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No matching cleaned records found.
                    </td>
                  </tr>
                ) : (
                  pagedCleaned.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-500">
                        {rec.id}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {rec.date}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{rec.product}</td>
                      <td className="px-3 py-2 text-slate-600">{rec.category}</td>
                      <td className="px-3 py-2 text-slate-600">{rec.region}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {formatNumber(rec.quantity)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {formatCurrency(rec.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrency(rec.sales)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Row</th>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRaw.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, headers.length + 1)} className="px-4 py-8 text-center text-slate-500">
                      No raw CSV rows to display.
                    </td>
                  </tr>
                ) : (
                  pagedRaw.map((row, idx) => (
                    <tr key={startIdx + idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-500">
                        {startIdx + idx + 1}
                      </td>
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                          {row[h]?.trim() ? (
                            row[h]
                          ) : (
                            <span className="text-amber-700 font-mono text-xs">[missing]</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
          <span className="font-mono tabular-nums">
            Showing {activeTotal === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, activeTotal)} of{' '}
            {formatNumber(activeTotal)} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono tabular-nums px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
