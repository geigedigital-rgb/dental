import { useEffect, useState } from 'react';
import { Tab } from '@headlessui/react';
import {
  ChartBarIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { reportsApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';

const defaultFrom = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const defaultTo = () => new Date().toISOString().slice(0, 10);

const CHART_COLORS = ['#3882EC', '#0ea5e9', '#38bdf8', '#7dd3fc', '#22c55e', '#f59e0b', '#ef4444'];

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

export function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [cashflowYear, setCashflowYear] = useState(() => new Date().getFullYear());

  const [profit, setProfit] = useState<any>(null);
  const [consumption, setConsumption] = useState<any[]>([]);
  const [serviceProfit, setServiceProfit] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [, setAlerts] = useState<any[]>([]);
  const [margin, setMargin] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [pl, setPl] = useState<any>(null);
  const [plYear, setPlYear] = useState(() => new Date().getFullYear());
  const [plLoading, setPlLoading] = useState(false);
  const [revenueMarginDaily, setRevenueMarginDaily] = useState<any[]>([]);
  const [warehouseDashboard, setWarehouseDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cashflowLoading, setCashflowLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsApi.profitByPeriod(from, to),
      reportsApi.materialConsumption(from, to),
      reportsApi.serviceProfitability(from, to),
      reportsApi.inventoryBalance(),
      reportsApi.lowStockAlerts(),
      reportsApi.marginAnalysis(from, to),
      reportsApi.revenueMarginDaily(from, to),
      reportsApi.warehouseDashboard(),
    ])
      .then(([p, c, sp, inv, a, m, rmd, wd]) => {
        setProfit(p);
        setConsumption(c);
        setServiceProfit(sp);
        setInventory(inv);
        setAlerts(a);
        setMargin(m);
        setRevenueMarginDaily(rmd);
        setWarehouseDashboard(wd);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    setPlLoading(true);
    reportsApi
      .pl(`${plYear}-01-01`, `${plYear}-12-31`)
      .then(setPl)
      .finally(() => setPlLoading(false));
  }, [plYear]);

  useEffect(() => {
    setCashflowLoading(true);
    reportsApi
      .cashflow(`${cashflowYear}-01-01`, `${cashflowYear}-12-31`, 'month')
      .then(setCashflow)
      .finally(() => setCashflowLoading(false));
  }, [cashflowYear]);

  if (loading) {
    return (
      <>
        <PageHeader title="Отчёты" breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Отчёты' }]} />
        <p className="text-sm text-gray-500">Загрузка отчётов…</p>
      </>
    );
  }

  const dateFilter = (
    <div
      role="group"
      aria-label="Период отчёта"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Период</span>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="reports-date-from">Начало</label>
        <input
          id="reports-date-from"
          type="date"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#3882EC] focus:outline-none focus:ring-2 focus:ring-[#3882EC]/20"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span className="text-gray-400 text-sm" aria-hidden>—</span>
        <label className="sr-only" htmlFor="reports-date-to">Конец</label>
        <input
          id="reports-date-to"
          type="date"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-[#3882EC] focus:outline-none focus:ring-2 focus:ring-[#3882EC]/20"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
    </div>
  );

  const tabs = [
    { name: 'Обзор', icon: ChartBarIcon },
    { name: 'Денежный поток', icon: BanknotesIcon },
    { name: 'P&L', icon: DocumentTextIcon },
    { name: 'Услуги', icon: ArrowTrendingUpIcon },
    { name: 'Материалы', icon: CubeIcon },
    { name: 'Склад', icon: CubeIcon },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Отчёты"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Отчёты' }]}
      />
      {dateFilter}

      <Tab.Group as="div" className="space-y-4">
        <div role="tablist" aria-label="Вкладки отчётов" className="flex flex-wrap gap-1.5">
        <Tab.List className="contents">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3882EC] focus-visible:ring-offset-1',
                  selected
                    ? 'border-gray-200 bg-white text-gray-900'
                    : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <tab.icon className="h-4 w-4 shrink-0" aria-hidden />
              {tab.name}
            </Tab>
          ))}
        </Tab.List>
        </div>

        <Tab.Panels className="mt-4">
          {/* Обзор */}
          <Tab.Panel className="space-y-6" unmount={false}>
            <section aria-labelledby="overview-kpi" className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <h2 id="overview-kpi" className="sr-only">Ключевые показатели</h2>
              <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Выручка</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#3882EC]">{formatMoney(Number(profit?.totalRevenue ?? 0))}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">за выбранный период</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Валовая маржа</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-600">{formatMoney(Number(profit?.totalGrossMargin ?? 0))}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">выручка − себестоимость</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Продаж</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{profit?.saleCount ?? 0}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">транзакций</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Ср. % маржи</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{margin?.avgMarginPercent?.toFixed(1) ?? 0}%</p>
                <p className="mt-0.5 text-[11px] text-gray-400">среднее по продажам</p>
              </div>
            </section>

            {revenueMarginDaily.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-800">Выручка и маржа по дням</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">в гривнах, по датам</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueMarginDaily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v}`} />
                      <Tooltip
                        formatter={(value: unknown) => [formatMoney(Number(value ?? 0)), '']}
                        labelFormatter={(label) => `Дата: ${label}`}
                        contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Выручка (грн)" stroke="#3882EC" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="margin" name="Маржа (грн)" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {serviceProfit.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-800">Выручка по услугам</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">доля в общей выручке</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceProfit.map((s, i) => ({ name: s.serviceName, value: s.totalRevenue, fill: CHART_COLORS[i % CHART_COLORS.length] }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={1}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      />
                      <Tooltip formatter={(value: unknown) => formatMoney(Number(value ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Tab.Panel>

          {/* Денежный поток / Учёт финансов по месяцам */}
          <Tab.Panel className="space-y-6" unmount={false}>
            <div
              role="group"
              aria-label="Год для учёта финансов"
              className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Год</span>
              <select
                value={cashflowYear}
                onChange={(e) => setCashflowYear(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#3882EC] focus:outline-none focus:ring-2 focus:ring-[#3882EC]/20"
              >
                {[new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {cashflowLoading ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50/80 py-6 text-center">
                <p className="text-sm text-gray-500">Загрузка…</p>
              </div>
            ) : cashflow && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Поступления за год</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-600">{formatMoney(cashflow.summary?.totalInflows ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Выплаты за год</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-red-600">{formatMoney(cashflow.summary?.totalOutflows ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Чистый поток</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{formatMoney(cashflow.summary?.netCashflow ?? 0)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-gray-800">Учёт финансов по месяцам</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">в гривнах: поступления и выплаты по всем операциям за выбранный год</p>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                          const byPeriod = new Map<string, { inflows: number; outflows: number }>();
                          for (const row of cashflow.series ?? []) {
                            byPeriod.set(row.period ?? row.label, { inflows: row.inflows ?? 0, outflows: row.outflows ?? 0 });
                          }
                          return monthNames.map((monthLabel, i) => {
                            const key = `${cashflowYear}-${String(i + 1).padStart(2, '0')}`;
                            const v = byPeriod.get(key) ?? { inflows: 0, outflows: 0 };
                            return { monthLabel, inflows: v.inflows, outflows: v.outflows };
                          });
                        })()}
                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v}`} />
                        <Tooltip
                          formatter={(value: unknown) => [formatMoney(Number(value ?? 0)), '']}
                          contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}
                        />
                        <Legend />
                        <Bar dataKey="inflows" name="Поступления" fill="#22c55e" stackId="stack" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="outflows" name="Выплаты" fill="#ef4444" stackId="stack" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </Tab.Panel>

          {/* P&L */}
          <Tab.Panel className="space-y-6" unmount={false}>
            <div
              role="group"
              aria-label="Год для P&L"
              className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Год P&L</span>
              <select
                value={plYear}
                onChange={(e) => setPlYear(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#3882EC] focus:outline-none focus:ring-2 focus:ring-[#3882EC]/20"
              >
                {[new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {(plLoading || pl) && (
              <>
                {plLoading && !pl ? (
                  <p className="text-sm text-gray-500">Загрузка P&L…</p>
                ) : pl && (
                <>
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-2">
                    <h3 className="text-sm font-medium text-gray-900">Отчёт о прибылях и убытках (P&L)</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Все транзакции: продажи, приходы, списания.</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <div className="flex justify-between items-center px-4 py-2" role="row">
                      <span className="text-sm text-gray-600">Выручка (продажи услуг)</span>
                      <span className="text-sm font-medium tabular-nums text-gray-900">{formatMoney(pl.summary.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50/50">
                      <span className="text-sm text-gray-500">Себестоимость проданного (материалы)</span>
                      <span className="text-sm font-medium tabular-nums text-gray-700">−{formatMoney(pl.summary.cogs)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2">
                      <span className="text-sm font-medium text-gray-800">Валовая прибыль</span>
                      <span className="text-sm font-semibold tabular-nums text-emerald-600">{formatMoney(pl.summary.grossProfit)} ({pl.summary.grossMarginPercent?.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50/50">
                      <span className="text-sm text-gray-500">Закупки (приходы товара)</span>
                      <span className="text-sm font-medium tabular-nums text-gray-700">−{formatMoney(pl.summary.purchases)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2">
                      <span className="text-sm text-gray-500">Доставка (по приходам)</span>
                      <span className="text-sm font-medium tabular-nums text-gray-700">−{formatMoney(pl.summary.delivery)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50/50">
                      <span className="text-sm text-gray-500">Списания (брак, порча, срок)</span>
                      <span className="text-sm font-medium tabular-nums text-gray-700">−{formatMoney(pl.summary.writeOffs)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2">
                      <span className="text-sm text-gray-600">Операционные расходы (доставка + списания)</span>
                      <span className="text-sm font-medium tabular-nums text-gray-700">−{formatMoney(pl.summary.operatingExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 bg-[#3882EC]/8 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-900">Чистая прибыль</span>
                      <span className="text-sm font-bold tabular-nums text-[#3882EC]">{formatMoney(pl.summary.netProfit)} ({pl.summary.netMarginPercent?.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 text-[11px] text-gray-400 border-t border-gray-100 bg-gray-50/80 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>Продаж: {pl.summary.saleCount}</span>
                    <span>Приходов: {pl.summary.entryCount}</span>
                    <span>Списаний: {pl.summary.writeOffCount}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-2">
                    <h3 className="text-sm font-medium text-gray-900">P&L по месяцам ({pl.year})</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Месяцы по горизонтали, показатели по вертикали</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/80">
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 min-w-[140px]">Показатель</th>
                          {pl.byMonth.map((m: any) => (
                            <th key={m.month} className="text-right py-2 px-1.5 font-semibold text-gray-700 whitespace-nowrap">{m.monthLabel}</th>
                          ))}
                          <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-gray-100">Итого</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-gray-600">Выручка</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums">{formatMoney(m.revenue)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums font-medium bg-gray-50">{formatMoney(pl.summary.revenue)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 bg-gray-50/30">
                          <td className="py-1.5 px-2 text-gray-500">Себестоимость</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums text-gray-600">−{formatMoney(m.cogs)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-600 bg-gray-50">−{formatMoney(pl.summary.cogs)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 font-medium text-gray-800">Валовая прибыль</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums text-emerald-600">{formatMoney(m.grossProfit)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-emerald-600 bg-gray-50">{formatMoney(pl.summary.grossProfit)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 bg-gray-50/30">
                          <td className="py-1.5 px-2 text-gray-500">Закупки</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums text-gray-600">−{formatMoney(m.purchases)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-600 bg-gray-50">−{formatMoney(pl.summary.purchases)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-gray-500">Доставка</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums text-gray-500">−{formatMoney(m.delivery)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-500 bg-gray-50">−{formatMoney(pl.summary.delivery)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 bg-gray-50/30">
                          <td className="py-1.5 px-2 text-gray-500">Списания</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums text-gray-500">−{formatMoney(m.writeOffs)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-500 bg-gray-50">−{formatMoney(pl.summary.writeOffs)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-gray-600">Опер. расходы</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums text-gray-600">−{formatMoney(m.operatingExpenses)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-600 bg-gray-50">−{formatMoney(pl.summary.operatingExpenses)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 border-t border-gray-200">
                          <td className="py-1.5 px-2 font-semibold text-gray-900">Чистая прибыль</td>
                          {pl.byMonth.map((m: any) => <td key={m.month} className="py-1.5 px-1.5 text-right tabular-nums font-medium text-[#3882EC]">{formatMoney(m.netProfit)}</td>)}
                          <td className="py-1.5 px-2 text-right tabular-nums font-bold text-[#3882EC] bg-[#3882EC]/5">{formatMoney(pl.summary.netProfit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
                )}
              </>
            )}
          </Tab.Panel>

          {/* Услуги */}
          <Tab.Panel className="space-y-6" unmount={false}>
            {serviceProfit.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-800">Рентабельность по услугам</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">выручка и маржа, в гривнах</p>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceProfit} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                      <YAxis type="category" dataKey="serviceName" tick={{ fontSize: 11 }} width={75} />
                      <Tooltip formatter={(value: unknown) => formatMoney(Number(value ?? 0))} />
                      <Bar dataKey="totalRevenue" name="Выручка" fill="#3882EC" radius={[0, 2, 2, 0]} />
                      <Bar dataKey="totalMargin" name="Маржа" fill="#22c55e" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50/80 px-3 py-1.5">
                <p className="text-[11px] text-gray-400">Все услуги за период</p>
              </div>
              <table className="min-w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th scope="col" className="text-left py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Услуга</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Продаж</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Выручка</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Маржа</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">% маржи</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {serviceProfit.map((s) => (
                    <tr key={s.serviceId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-gray-900">{s.serviceName}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{s.saleCount}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{formatMoney(s.totalRevenue)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-emerald-600">{formatMoney(s.totalMargin)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{s.avgMarginPercent?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tab.Panel>

          {/* Материалы */}
          <Tab.Panel className="space-y-6" unmount={false}>
            {consumption.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-800">Расход материалов (стоимость)</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">топ-12 по сумме, в гривнах</p>
                </div>
                <div className="h-[340px] min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={consumption.slice(0, 12)}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <YAxis
                        type="category"
                        dataKey="materialName"
                        width={140}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(56, 130, 236, 0.08)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0].payload as { materialName?: string; quantity?: number; cost?: number };
                          return (
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                              <p className="font-medium text-gray-900 border-b border-gray-100 pb-1.5 mb-1.5">
                                {row.materialName ?? '—'}
                              </p>
                              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                                <dt className="text-gray-500">Сумма:</dt>
                                <dd className="tabular-nums font-medium text-gray-900">{formatMoney(row.cost ?? 0)}</dd>
                                {row.quantity != null && (
                                  <>
                                    <dt className="text-gray-500">Кол-во:</dt>
                                    <dd className="tabular-nums text-gray-700">{Number(row.quantity).toLocaleString('uk-UA')}</dd>
                                  </>
                                )}
                              </dl>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="cost" name="Сумма (грн)" fill="#3882EC" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50/80 px-3 py-1.5">
                <p className="text-[11px] text-gray-400">Полный список расхода за период</p>
              </div>
              <table className="min-w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th scope="col" className="text-left py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Материал</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Кол-во</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consumption.map((c) => (
                    <tr key={c.materialId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-gray-900">{c.materialName}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{c.quantity?.toLocaleString('uk-UA')}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{formatMoney(c.cost ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tab.Panel>

          {/* Склад */}
          <Tab.Panel className="space-y-6" unmount={false}>
            {warehouseDashboard && (
              <section aria-labelledby="warehouse-kpi" className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <h2 id="warehouse-kpi" className="sr-only">Показатели склада</h2>
                <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Стоимость склада</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#3882EC]">{formatMoney(warehouseDashboard.totalStockValue)}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">по себестоимости</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Позиций в наличии</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{warehouseDashboard.positionsInStock ?? 0}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">с ненулевым остатком</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Всего позиций</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-700">{warehouseDashboard.positionsTotal ?? 0}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">в справочнике</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3" role="article">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Нулевой остаток</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-700">{warehouseDashboard.positionsOutOfStock ?? 0}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">требуют дозаказа</p>
                </div>
              </section>
            )}

            {warehouseDashboard?.lowStockAlerts?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                  <h3 className="text-sm font-medium text-gray-800">Низкий остаток</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">ниже минимального порога, рекомендуется дозаказ</p>
                <ul className="divide-y divide-amber-100">
                  {warehouseDashboard.lowStockAlerts.map((a: any) => (
                    <li key={a.materialId} className="flex justify-between items-center py-2 text-sm">
                      <span className="font-medium text-gray-900">{a.materialName}</span>
                      <span className="text-gray-500">
                        Остаток: {a.currentQuantity} {a.unit} (мин. {a.minThreshold})
                        {a.shortage > 0 && (
                          <span className="ml-1 text-amber-600">— дозаказ ≈ {formatMoney(a.estimatedCostToRestock)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50/80 px-3 py-1.5">
                <p className="text-[11px] text-gray-400">Остатки на складе на дату отчёта</p>
              </div>
              <table className="min-w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th scope="col" className="text-left py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Материал</th>
                    <th scope="col" className="text-left py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Категория</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Кол-во</th>
                    <th scope="col" className="text-right py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">Стоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventory.map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-gray-900">{i.name}</td>
                      <td className="py-2 px-3 text-gray-500">{i.category}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{i.quantity?.toLocaleString('uk-UA')}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{formatMoney(i.totalValue ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
