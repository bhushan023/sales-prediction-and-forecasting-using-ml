// Deterministic seeded PRNG (Mulberry32) for generating a realistic, reproducible sample dataset
function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CatalogItem {
  product: string;
  category: string;
  unitPrice: number;
  weight: number;
}

const CATALOG: CatalogItem[] = [
  { product: 'Enterprise Cloud Suite', category: 'Software', unitPrice: 480, weight: 1.2 },
  { product: 'Analytics Pro License', category: 'Software', unitPrice: 290, weight: 1.4 },
  { product: 'Edge Compute Workstation', category: 'Hardware', unitPrice: 1250, weight: 0.7 },
  { product: 'Smart POS Terminal', category: 'Hardware', unitPrice: 360, weight: 1.1 },
  { product: 'Wireless Barcode Scanner', category: 'Accessories', unitPrice: 115, weight: 1.8 },
  { product: 'Thermal Receipt Printer', category: 'Accessories', unitPrice: 195, weight: 1.3 },
  { product: 'Annual Support Retainer', category: 'Services', unitPrice: 650, weight: 0.9 },
  { product: 'Data Migration Package', category: 'Services', unitPrice: 820, weight: 0.6 },
];

const REGIONS = [
  { name: 'North America', mult: 1.25 },
  { name: 'Europe', mult: 1.08 },
  { name: 'Asia Pacific', mult: 1.15 },
  { name: 'Latin America', mult: 0.85 },
];

export function generateSampleSalesCsv(): string {
  const rng = createRng(20250419);
  const rows: string[] = [
    'Date,Product,Category,Quantity,Unit Price,Sales,Region',
  ];

  // Generate 18 months of daily transactions (Jul 1, 2024 to Dec 31, 2025)
  const start = new Date(Date.UTC(2024, 6, 1));
  const totalDays = 549;

  const sampleBuffer: string[] = [];

  for (let d = 0; d < totalDays; d++) {
    const cur = new Date(start.getTime() + d * 86400000);
    const yyyy = cur.getUTCFullYear();
    const mm = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(cur.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const month = cur.getUTCMonth(); // 0-11
    const dow = cur.getUTCDay(); // 0=Sun, 6=Sat

    // Trend factor (+25% growth over period) + Q4/Summer seasonality + weekday bump
    const trendFactor = 1 + (d / totalDays) * 0.28;
    const seasonalFactor = 1 + 0.18 * Math.sin(((month - 8) / 12) * Math.PI * 2) + (month === 10 || month === 11 ? 0.18 : 0);
    const dowFactor = dow === 0 || dow === 6 ? 0.72 : 1.1;

    // 2 to 3 orders per day with consistent catalog mix so daily aggregate has clear trend & seasonality
    const txCount = 2;

    for (let t = 0; t < txCount; t++) {
      const item = CATALOG[(d * 2 + t * 3) % CATALOG.length];
      const region = REGIONS[(d + t) % REGIONS.length];

      const baseQty = Math.max(
        1,
        Math.round((2.5 + rng() * 2.2) * trendFactor * seasonalFactor * dowFactor * item.weight * region.mult)
      );

      // Slight realistic price variation (promotions / bulk pricing +/- 4%)
      const priceVariance = 1 + (rng() - 0.5) * 0.08;
      const unitPrice = Number((item.unitPrice * priceVariance).toFixed(2));
      const discountOrFee = 1 + (rng() - 0.48) * 0.05;
      const sales = Number((baseQty * unitPrice * discountOrFee).toFixed(2));

      let rowStr = `${dateStr},${item.product},${item.category},${baseQty},${unitPrice.toFixed(2)},${sales.toFixed(2)},${region.name}`;

      // Inject 5 realistic minor data quality imperfections so the cleaning audit demonstrates real detection
      if (d === 42 && t === 0) {
        // Missing quantity
        rowStr = `${dateStr},${item.product},${item.category},,${unitPrice.toFixed(2)},${sales.toFixed(2)},${region.name}`;
      } else if (d === 128 && t === 0) {
        // Missing unit price
        rowStr = `${dateStr},${item.product},${item.category},${baseQty},,${sales.toFixed(2)},${region.name}`;
      } else if (d === 265 && t === 0) {
        // Missing category
        rowStr = `${dateStr},${item.product},,${baseQty},${unitPrice.toFixed(2)},${sales.toFixed(2)},${region.name}`;
      } else if (d === 412 && t === 0) {
        // Missing region
        rowStr = `${dateStr},${item.product},${item.category},${baseQty},${unitPrice.toFixed(2)},${sales.toFixed(2)},`;
      } else if (d === 580 && t === 0) {
        // Missing sales (recoverable via quantity * unitPrice)
        rowStr = `${dateStr},${item.product},${item.category},${baseQty},${unitPrice.toFixed(2)},,${region.name}`;
      }

      sampleBuffer.push(rowStr);

      // Inject 3 exact duplicate rows to demonstrate duplicate detection & removal
      if ((d === 95 || d === 310 || d === 515) && t === 0) {
        sampleBuffer.push(rowStr);
      }
    }
  }

  return [...rows, ...sampleBuffer].join('\n');
}
