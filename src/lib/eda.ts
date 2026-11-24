import type {
  AggregatedSegment,
  DailySalesPoint,
  EDASummary,
  MonthlySalesPoint,
  SalesRecord,
  YearlyComparisonPoint,
} from '../types/sales.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildSegments(
  records: SalesRecord[],
  keyFn: (r: SalesRecord) => string,
  totalRevenue: number
): AggregatedSegment[] {
  const map = new Map<string, { sales: number; orders: number; units: number }>();
  for (const r of records) {
    const key = keyFn(r);
    const cur = map.get(key) || { sales: 0, orders: 0, units: 0 };
    cur.sales += r.sales;
    cur.orders += 1;
    cur.units += r.quantity;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([name, stat]) => ({
      name,
      sales: Number(stat.sales.toFixed(2)),
      orders: stat.orders,
      units: Number(stat.units.toFixed(2)),
      sharePct: totalRevenue > 0 ? Number(((stat.sales / totalRevenue) * 100).toFixed(2)) : 0,
      avgOrderValue: stat.orders > 0 ? Number((stat.sales / stat.orders).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.sales - a.sales);
}

export function computeEDASummary(records: SalesRecord[]): EDASummary | null {
  if (records.length === 0) return null;

  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let highest = { value: -Infinity, date: records[0].date, product: records[0].product };
  let lowest = { value: Infinity, date: records[0].date, product: records[0].product };

  const dailyMap = new Map<string, { sales: number; orders: number; units: number }>();
  const monthlyMap = new Map<string, { year: number; month: number; sales: number; orders: number; units: number }>();
  const productStats = new Map<string, { category: string; priceSum: number; salesSum: number; count: number }>();
  const categoriesSet = new Set<string>();
  const regionsSet = new Set<string>();
  const yearsSet = new Set<number>();

  let minDate = records[0].date;
  let maxDate = records[0].date;

  for (const r of records) {
    totalRevenue += r.sales;
    totalUnitsSold += r.quantity;
    if (r.date < minDate) minDate = r.date;
    if (r.date > maxDate) maxDate = r.date;

    if (r.sales > highest.value) {
      highest = { value: r.sales, date: r.date, product: r.product };
    }
    if (r.sales < lowest.value) {
      lowest = { value: r.sales, date: r.date, product: r.product };
    }

    const dCur = dailyMap.get(r.date) || { sales: 0, orders: 0, units: 0 };
    dCur.sales += r.sales;
    dCur.orders += 1;
    dCur.units += r.quantity;
    dailyMap.set(r.date, dCur);

    const [yStr, mStr] = r.date.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    yearsSet.add(year);
    const monthKey = `${yStr}-${mStr}`;
    const mCur = monthlyMap.get(monthKey) || { year, month, sales: 0, orders: 0, units: 0 };
    mCur.sales += r.sales;
    mCur.orders += 1;
    mCur.units += r.quantity;
    monthlyMap.set(monthKey, mCur);

    const pCur = productStats.get(r.product) || { category: r.category, priceSum: 0, salesSum: 0, count: 0 };
    pCur.priceSum += r.unitPrice;
    pCur.salesSum += r.sales;
    pCur.count += 1;
    productStats.set(r.product, pCur);

    categoriesSet.add(r.category);
    regionsSet.add(r.region);
  }

  const dailySales: DailySalesPoint[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stat]) => ({
      date,
      sales: Number(stat.sales.toFixed(2)),
      orders: stat.orders,
      units: Number(stat.units.toFixed(2)),
    }));

  const sortedMonths = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  const monthlySales: MonthlySalesPoint[] = sortedMonths.map(([monthKey, stat], idx) => {
    const prev = idx > 0 ? sortedMonths[idx - 1][1].sales : null;
    const growthPct = prev && prev > 0 ? Number((((stat.sales - prev) / prev) * 100).toFixed(2)) : null;
    return {
      monthKey,
      label: `${MONTH_NAMES[stat.month - 1]} ${stat.year}`,
      year: stat.year,
      month: stat.month,
      sales: Number(stat.sales.toFixed(2)),
      orders: stat.orders,
      units: Number(stat.units.toFixed(2)),
      growthPct,
    };
  });

  const growthVals = monthlySales
    .map((m) => m.growthPct)
    .filter((g): g is number => g !== null && Number.isFinite(g));

  const latestMonthGrowthPct = growthVals.length > 0 ? growthVals[growthVals.length - 1] : null;
  const avgMonthlyGrowthPct =
    growthVals.length > 0
      ? Number((growthVals.reduce((acc, v) => acc + v, 0) / growthVals.length).toFixed(2))
      : null;

  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const yearlyComparison: YearlyComparisonPoint[] = MONTH_NAMES.map((monthName, idx) => {
    const mNum = idx + 1;
    const point: YearlyComparisonPoint = { monthIndex: mNum, monthName };
    for (const y of years) {
      const mKey = `${y}-${String(mNum).padStart(2, '0')}`;
      const found = monthlyMap.get(mKey);
      point[String(y)] = found ? Number(found.sales.toFixed(2)) : 0;
    }
    return point;
  });

  const productDefaults: Record<string, { category: string; avgUnitPrice: number; avgSales: number }> = {};
  for (const [prod, stat] of productStats.entries()) {
    productDefaults[prod] = {
      category: stat.category,
      avgUnitPrice: Number((stat.priceSum / stat.count).toFixed(2)),
      avgSales: Number((stat.salesSum / stat.count).toFixed(2)),
    };
  }

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalOrders: records.length,
    totalUnitsSold: Number(totalUnitsSold.toFixed(2)),
    averageSales: Number((totalRevenue / records.length).toFixed(2)),
    highestSales: { ...highest, value: Number(highest.value.toFixed(2)) },
    lowestSales: { ...lowest, value: Number(lowest.value.toFixed(2)) },
    latestMonthGrowthPct,
    avgMonthlyGrowthPct,
    dateRange: { start: minDate, end: maxDate },
    uniqueProducts: Array.from(productStats.keys()).sort(),
    uniqueCategories: Array.from(categoriesSet).sort(),
    uniqueRegions: Array.from(regionsSet).sort(),
    productDefaults,
    dailySales,
    monthlySales,
    yearlyComparison,
    years,
    salesByProduct: buildSegments(records, (r) => r.product, totalRevenue),
    salesByCategory: buildSegments(records, (r) => r.category, totalRevenue),
    salesByRegion: buildSegments(records, (r) => r.region, totalRevenue),
  };
}
