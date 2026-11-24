import { BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../lib/formatters.ts';
import type { EDASummary } from '../types/sales.ts';

interface SalesVisualizationViewProps {
  eda: EDASummary | null;
  onNavigateUpload: () => void;
}

const CHART_COLORS = [
  '#1d4ed8',
  '#0284c7',
  '#0d9488',
  '#4f46e5',
  '#2563eb',
  '#0369a1',
  '#0f766e',
  '#6366f1',
];

export function SalesVisualizationView({ eda, onNavigateUpload }: SalesVisualizationViewProps) {
  const [dailyRange, setDailyRange] = useState<'all' | '90' | '30'>('90');

  const filteredDaily = useMemo(() => {
    if (!eda) return [];
    if (dailyRange === 'all') return eda.dailySales;
    const count = dailyRange === '30' ? 30 : 90;
    return eda.dailySales.slice(-count);
  }, [eda, dailyRange]);

  if (!eda) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">No Visualizations Available</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload a sales dataset to generate interactive visual analytics.
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
      {/* Row 1: Monthly Sales Trend + Category Pie Chart */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Monthly Sales Trend</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total revenue trajectory by calendar month
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eda.monthlySales} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), true)}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Monthly Revenue"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#1d4ed8' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Category-wise Sales Share</h3>
          <p className="text-xs text-slate-500 mt-0.5">Proportional revenue breakdown</p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eda.salesByCategory}
                  dataKey="sales"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {eda.salesByCategory.map((entry, idx) => (
                    <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Row 2: Product-wise Sales + Region-wise Sales */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Product-wise Sales</h3>
          <p className="text-xs text-slate-500 mt-0.5">Top products ranked by total revenue</p>
          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eda.salesByProduct.slice(0, 10)}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 20, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => formatCurrency(Number(v), true)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: '#334155' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="sales" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Region-wise Sales</h3>
          <p className="text-xs text-slate-500 mt-0.5">Total revenue across geographic regions</p>
          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eda.salesByRegion} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), true)}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {eda.salesByRegion.map((entry, idx) => (
                    <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Row 3: Daily Sales Trend + Monthly & Yearly Comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Daily Sales Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Granular day-by-day revenue fluctuations
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              {(['30', '90', 'all'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDailyRange(range)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    dailyRange === range
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range === 'all' ? 'All Days' : `Last ${range}D`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredDaily} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="dailySalesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), true)}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Daily Sales']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  fill="url(#dailySalesFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Monthly &amp; Yearly Sales Comparison
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side seasonal comparison across years ({eda.years.join(', ')})
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eda.yearlyComparison} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="monthName" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), true)}
                />
                <Tooltip
                  formatter={(v, name) => [formatCurrency(Number(v)), `Year ${name}`]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {eda.years.map((y, idx) => (
                  <Bar
                    key={y}
                    dataKey={String(y)}
                    name={String(y)}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
