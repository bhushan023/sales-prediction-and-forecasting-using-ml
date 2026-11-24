import { ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../lib/formatters.ts';
import type { EDASummary } from '../types/sales.ts';

interface DataAnalysisViewProps {
  eda: EDASummary | null;
  onNavigateUpload: () => void;
}

export function DataAnalysisView({ eda, onNavigateUpload }: DataAnalysisViewProps) {
  if (!eda) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">No Data Available for EDA</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload or load a sales dataset first to inspect exploratory statistics.
        </p>
        <button
          type="button"
          onClick={onNavigateUpload}
          className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Go to Upload Dataset
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Descriptive KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Sales Revenue</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(eda.totalRevenue)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {eda.dateRange.start} to {eda.dateRange.end}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Number of Orders</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(eda.totalOrders)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {eda.dailySales.length} active sales days
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Products Sold (Units)</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(eda.totalUnitsSold)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {eda.uniqueProducts.length} distinct products
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Average Sales per Order</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(eda.averageSales)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">Mean transaction revenue</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Highest Single Sale</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {formatCurrency(eda.highestSales.value)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 truncate">
            {eda.highestSales.product} · {eda.highestSales.date}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Lowest Single Sale</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(eda.lowestSales.value)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 truncate">
            {eda.lowestSales.product} · {eda.lowestSales.date}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Latest Monthly Sales Growth</p>
          <p
            className={`mt-2 text-2xl font-bold font-mono tabular-nums flex items-center gap-1 ${
              (eda.latestMonthGrowthPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {eda.latestMonthGrowthPct !== null &&
              ((eda.latestMonthGrowthPct ?? 0) >= 0 ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              ))}
            {formatPercent(eda.latestMonthGrowthPct)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">Most recent month-over-month</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Average Monthly Growth</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatPercent(eda.avgMonthlyGrowthPct)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            Across {eda.monthlySales.length} months
          </p>
        </div>
      </section>

      {/* Segment Breakdowns: Category & Region */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Sales by Category</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Revenue distribution, order count, and share across product categories
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-left font-medium">Category</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Units</th>
                  <th className="py-2 text-right font-medium">Share</th>
                  <th className="py-2 text-right font-medium">Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eda.salesByCategory.map((c) => (
                  <tr key={c.name} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{c.name}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(c.orders)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(c.units)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {c.sharePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(c.sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Sales by Region</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic revenue performance and average order size
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-left font-medium">Region</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Avg Order</th>
                  <th className="py-2 text-right font-medium">Share</th>
                  <th className="py-2 text-right font-medium">Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eda.salesByRegion.map((r) => (
                  <tr key={r.name} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{r.name}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(r.orders)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatCurrency(r.avgOrderValue)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {r.sharePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(r.sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Product-wise & Monthly Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Sales by Product</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete item-level contribution sorted by total revenue
          </p>
          <div className="mt-4 overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2 text-left font-medium">Product</th>
                  <th className="py-2 text-right font-medium">Units</th>
                  <th className="py-2 text-right font-medium">Avg Order</th>
                  <th className="py-2 text-right font-medium">Share</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eda.salesByProduct.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{p.name}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(p.units)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatCurrency(p.avgOrderValue)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {p.sharePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(p.sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Monthly Sales &amp; Growth Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Month-over-month revenue progression across the dataset timeline
          </p>
          <div className="mt-4 overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2 text-left font-medium">Month</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">MoM Growth</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eda.monthlySales.map((m) => (
                  <tr key={m.monthKey} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{m.label}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(m.orders)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-mono tabular-nums font-medium ${
                        m.growthPct === null
                          ? 'text-slate-400'
                          : m.growthPct >= 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      {formatPercent(m.growthPct)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(m.sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
