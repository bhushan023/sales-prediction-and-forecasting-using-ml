import Papa from 'papaparse';
import type {
  CleaningOptions,
  CleaningReport,
  ColumnMapping,
  RawCsvRow,
  SalesRecord,
} from '../types/sales.ts';

export interface ParsedCsvResult {
  headers: string[];
  rows: RawCsvRow[];
  suggestedMapping: ColumnMapping;
  errors: string[];
}

const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  date: [
    'date',
    'order_date',
    'order date',
    'order dt',
    'transaction_date',
    'transaction date',
    'trans date',
    'sales_date',
    'sale date',
    'invoice date',
    'timestamp',
    'day',
    'period',
  ],
  sales: ['sales', 'total_sales', 'total sales', 'revenue', 'total_revenue', 'amount', 'total', 'net_sales', 'gross_sales', 'price_total'],
  product: ['product', 'product_name', 'product name', 'item', 'item_name', 'sku', 'title', 'merchandise'],
  category: ['category', 'product_category', 'dept', 'department', 'segment', 'type', 'group'],
  quantity: ['quantity', 'qty', 'units', 'units_sold', 'units sold', 'count', 'volume'],
  unitPrice: ['unit_price', 'unit price', 'price', 'rate', 'unit_cost', 'cost_per_unit'],
  region: ['region', 'location', 'area', 'territory', 'market', 'country', 'state', 'zone', 'branch'],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: '',
    sales: '',
    product: '',
    category: '',
    quantity: '',
    unitPrice: '',
    region: '',
  };

  const used = new Set<string>();

  (Object.keys(COLUMN_ALIASES) as Array<keyof ColumnMapping>).forEach((field) => {
    const aliases = COLUMN_ALIASES[field];
    // Exact normalized match first
    let matched = headers.find((h) => !used.has(h) && aliases.includes(normalizeHeader(h)));
    // Partial contains match second
    if (!matched) {
      matched = headers.find((h) => {
        if (used.has(h)) return false;
        const norm = normalizeHeader(h);
        return aliases.some((alias) => norm.includes(alias));
      });
    }
    if (matched) {
      mapping[field] = matched;
      used.add(matched);
    }
  });

  return mapping;
}

export function parseCsvString(csvText: string): ParsedCsvResult {
  const trimmed = csvText.trim();
  if (!trimmed) {
    return {
      headers: [],
      rows: [],
      suggestedMapping: suggestColumnMapping([]),
      errors: ['The uploaded CSV file is empty.'],
    };
  }

  const parsed = Papa.parse<RawCsvRow>(trimmed, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const headers = (parsed.meta.fields || []).filter((h) => h.length > 0);
  const errors = parsed.errors
    .slice(0, 5)
    .map((err) => `Row ${err.row ?? '?'}: ${err.message}`);

  if (headers.length === 0) {
    errors.push('No column headers were detected in the CSV file.');
  }

  return {
    headers,
    rows: parsed.data,
    suggestedMapping: suggestColumnMapping(headers),
    errors,
  };
}

export function parseDateStrict(raw: string | undefined): { iso: string; timestamp: number } | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // Handle YYYY-MM-DD or YYYY/MM/DD explicitly to avoid timezone shifts
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const ts = Date.UTC(y, m - 1, d);
      const check = new Date(ts);
      if (check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d) {
        return {
          iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          timestamp: ts,
        };
      }
    }
  }

  // Handle MM/DD/YYYY or DD/MM/YYYY (prefer MM/DD/YYYY unless first > 12)
  const slashMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    let p1 = Number(slashMatch[1]);
    let p2 = Number(slashMatch[2]);
    const y = Number(slashMatch[3]);
    let m = p1;
    let d = p2;
    if (p1 > 12 && p2 <= 12) {
      d = p1;
      m = p2;
    }
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const ts = Date.UTC(y, m - 1, d);
      const check = new Date(ts);
      if (check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d) {
        return {
          iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          timestamp: ts,
        };
      }
    }
  }

  // Fallback to native Date parsing
  const parsedTs = Date.parse(cleaned);
  if (!Number.isNaN(parsedTs)) {
    const dt = new Date(parsedTs);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    if (y >= 1970 && y <= 2100) {
      return {
        iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        timestamp: Date.UTC(y, m - 1, d),
      };
    }
  }

  return null;
}

export function parseNumericStrict(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Strip currency symbols, commas, spaces
  const sanitized = trimmed.replace(/[$€£¥,\s]/g, '');
  if (!sanitized || sanitized === '-' || sanitized === '.') return null;
  const num = Number(sanitized);
  if (!Number.isFinite(num)) return null;
  return num;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function modeString(values: string[], fallback: string): string {
  if (values.length === 0) return fallback;
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = fallback;
  let bestCount = -1;
  for (const [k, c] of counts.entries()) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export function cleanAndTransformDataset(
  rows: RawCsvRow[],
  headers: string[],
  mapping: ColumnMapping,
  options: CleaningOptions
): { records: SalesRecord[]; report: CleaningReport } {
  const warnings: string[] = [];
  const missingByColumn: Record<string, number> = {};
  headers.forEach((h) => {
    missingByColumn[h] = 0;
  });

  let missingValuesFound = 0;
  for (const row of rows) {
    for (const h of headers) {
      const val = row[h];
      if (val === undefined || val === null || val.trim() === '') {
        missingValuesFound++;
        missingByColumn[h] = (missingByColumn[h] || 0) + 1;
      }
    }
  }

  // Deduplicate exact rows if requested
  let workingRows = rows;
  let duplicatesRemoved = 0;
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const deduped: RawCsvRow[] = [];
    for (const row of rows) {
      const sig = headers.map((h) => (row[h] ?? '').trim()).join('\u0001');
      if (seen.has(sig)) {
        duplicatesRemoved++;
      } else {
        seen.add(sig);
        deduped.push(row);
      }
    }
    workingRows = deduped;
  }

  if (!mapping.date) {
    warnings.push('No Date column is mapped. Please select a valid Date column.');
    return {
      records: [],
      report: {
        rawRows: rows.length,
        rawColumns: headers.length,
        cleanedRows: 0,
        duplicatesRemoved,
        missingValuesFound,
        missingByColumn,
        invalidDatesDropped: rows.length,
        invalidSalesHandled: 0,
        warnings,
      },
    };
  }

  if (!mapping.sales && !(mapping.quantity && mapping.unitPrice)) {
    warnings.push('Map either a Sales column or both Quantity and Unit Price columns.');
    return {
      records: [],
      report: {
        rawRows: rows.length,
        rawColumns: headers.length,
        cleanedRows: 0,
        duplicatesRemoved,
        missingValuesFound,
        missingByColumn,
        invalidDatesDropped: 0,
        invalidSalesHandled: rows.length,
        warnings,
      },
    };
  }

  // First pass: collect valid values for imputation medians/modes
  const validQtys: number[] = [];
  const validPrices: number[] = [];
  const validSales: number[] = [];
  const validProducts: string[] = [];
  const validCategories: string[] = [];
  const validRegions: string[] = [];

  for (const row of workingRows) {
    if (mapping.quantity) {
      const q = parseNumericStrict(row[mapping.quantity]);
      if (q !== null && q > 0) validQtys.push(q);
    }
    if (mapping.unitPrice) {
      const p = parseNumericStrict(row[mapping.unitPrice]);
      if (p !== null && p >= 0) validPrices.push(p);
    }
    if (mapping.sales) {
      const s = parseNumericStrict(row[mapping.sales]);
      if (s !== null && s >= 0) validSales.push(s);
    }
    if (mapping.product && row[mapping.product]?.trim()) validProducts.push(row[mapping.product].trim());
    if (mapping.category && row[mapping.category]?.trim()) validCategories.push(row[mapping.category].trim());
    if (mapping.region && row[mapping.region]?.trim()) validRegions.push(row[mapping.region].trim());
  }

  const medianQty = validQtys.length > 0 ? Math.max(1, Math.round(median(validQtys))) : 1;
  const medianPrice = validPrices.length > 0 ? Number(median(validPrices).toFixed(2)) : 0;
  const medianSales = validSales.length > 0 ? Number(median(validSales).toFixed(2)) : 0;
  const modeProduct = modeString(validProducts, 'Standard Product');
  const modeCategory = modeString(validCategories, 'General');
  const modeRegion = modeString(validRegions, 'Global');

  let invalidDatesDropped = 0;
  let invalidSalesHandled = 0;
  const cleaned: SalesRecord[] = [];

  for (let i = 0; i < workingRows.length; i++) {
    const row = workingRows[i];
    const parsedDate = parseDateStrict(row[mapping.date]);
    if (!parsedDate) {
      invalidDatesDropped++;
      continue;
    }

    const rawProduct = mapping.product ? row[mapping.product]?.trim() : '';
    const rawCategory = mapping.category ? row[mapping.category]?.trim() : '';
    const rawRegion = mapping.region ? row[mapping.region]?.trim() : '';

    if (options.missingStrategy === 'drop') {
      if ((mapping.product && !rawProduct) || (mapping.category && !rawCategory) || (mapping.region && !rawRegion)) {
        invalidSalesHandled++;
        continue;
      }
    }

    const product = rawProduct || (mapping.product ? modeProduct : 'Standard Product');
    const category = rawCategory || (mapping.category ? modeCategory : 'General');
    const region = rawRegion || (mapping.region ? modeRegion : 'Global');

    let qty = mapping.quantity ? parseNumericStrict(row[mapping.quantity]) : 1;
    let unitPrice = mapping.unitPrice ? parseNumericStrict(row[mapping.unitPrice]) : null;
    let sales = mapping.sales ? parseNumericStrict(row[mapping.sales]) : null;

    if (options.missingStrategy === 'drop') {
      if ((mapping.quantity && (qty === null || qty <= 0)) ||
          (mapping.unitPrice && (unitPrice === null || unitPrice < 0)) ||
          (mapping.sales && (sales === null || sales < 0))) {
        invalidSalesHandled++;
        continue;
      }
    }

    // Derive or impute missing numeric values cleanly
    if (qty === null || qty <= 0) {
      if (sales !== null && unitPrice !== null && unitPrice > 0) {
        qty = Math.max(1, Math.round(sales / unitPrice));
      } else {
        qty = medianQty;
      }
    }

    if (sales === null || sales < 0) {
      invalidSalesHandled++;
      if (unitPrice !== null && unitPrice >= 0) {
        sales = Number((qty * unitPrice).toFixed(2));
      } else if (medianSales > 0) {
        sales = medianSales;
      } else {
        continue;
      }
    }

    if (unitPrice === null || unitPrice < 0) {
      unitPrice = qty > 0 ? Number((sales / qty).toFixed(2)) : medianPrice;
    }

    cleaned.push({
      id: i + 1,
      date: parsedDate.iso,
      timestamp: parsedDate.timestamp,
      product,
      category,
      quantity: Number(qty.toFixed(2)),
      unitPrice: Number(unitPrice.toFixed(2)),
      sales: Number(sales.toFixed(2)),
      region,
    });
  }

  // Sort strictly chronologically for time-series consistency
  cleaned.sort((a, b) => a.timestamp - b.timestamp || a.id - b.id);
  cleaned.forEach((rec, idx) => {
    rec.id = idx + 1;
  });

  if (cleaned.length < 20) {
    warnings.push('Dataset has fewer than 20 valid records. Model accuracy may be limited.');
  }

  return {
    records: cleaned,
    report: {
      rawRows: rows.length,
      rawColumns: headers.length,
      cleanedRows: cleaned.length,
      duplicatesRemoved,
      missingValuesFound,
      missingByColumn,
      invalidDatesDropped,
      invalidSalesHandled,
      warnings,
    },
  };
}

export function exportRecordsToCsv(records: SalesRecord[]): string {
  return Papa.unparse(
    records.map((r) => ({
      Date: r.date,
      Product: r.product,
      Category: r.category,
      Quantity: r.quantity,
      'Unit Price': r.unitPrice,
      Sales: r.sales,
      Region: r.region,
    }))
  );
}
