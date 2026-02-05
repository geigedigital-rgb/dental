import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  CubeIcon,
  BanknotesIcon,
  Squares2X2Icon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../shared/PageHeader';
import { CardBlock } from '../../shared/CardBlock';
import { reportsApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';

type LowStockAlert = {
  materialId: string;
  materialName: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minThreshold: number;
  shortage: number;
  averageCost: number;
  estimatedCostToRestock: number;
  isZero: boolean;
};

type WarehouseDashboard = {
  totalStockValue: number;
  positionsTotal: number;
  positionsInStock: number;
  positionsOutOfStock: number;
  lowStockAlerts: LowStockAlert[];
};

export function Dashboard() {
  const [warehouse, setWarehouse] = useState<WarehouseDashboard | null>(null);
  const [profit, setProfit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    setLoadError(null);
    Promise.all([
      reportsApi.warehouseDashboard(),
      reportsApi.profitByPeriod(fromStr, toStr),
    ])
      .then(([w, p]) => {
        setWarehouse(w);
        setProfit(p);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка сети';
        setLoadError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Главная" breadcrumbs={[{ label: 'Главная' }]} />
        <p className="text-xs text-gray-500">Загрузка…</p>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Главная" breadcrumbs={[{ label: 'Главная' }]} />
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          <p className="font-medium">Не удалось загрузить данные</p>
          <p className="mt-1 text-xs text-amber-700">{loadError}</p>
          <p className="mt-2 text-xs text-amber-700">
            Убедитесь, что бэкенд запущен (npm run start:dev в папке backend) и база данных доступна. Если бэкенд работал долго — перезапустите его.
          </p>
        </div>
      </>
    );
  }

  const alerts = warehouse?.lowStockAlerts ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Главная" breadcrumbs={[{ label: 'Главная' }]} />

      {/* Bento: склад — главные цифры */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CardBlock
          title="Стоимость товаров на складе"
          icon={<BanknotesIcon className="h-5 w-5" />}
          className="lg:col-span-2"
        >
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">
            {formatMoney(warehouse?.totalStockValue ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">по средней себестоимости</p>
        </CardBlock>
        <CardBlock
          title="Позиций в наличии"
          icon={<CubeIcon className="h-5 w-5" />}
        >
          <p className="text-xl font-semibold text-gray-900 tabular-nums">
            {warehouse?.positionsInStock ?? 0}
          </p>
          <p className="text-xs text-gray-500">наименований с остатком &gt; 0</p>
        </CardBlock>
        <CardBlock
          title="Всего наименований"
          icon={<Squares2X2Icon className="h-5 w-5" />}
        >
          <p className="text-xl font-semibold text-gray-900 tabular-nums">
            {warehouse?.positionsTotal ?? 0}
          </p>
          <p className="text-xs text-gray-500">в справочнике материалов</p>
        </CardBlock>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CardBlock
          title="Нет в наличии"
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
        >
          <p className="text-xl font-semibold text-gray-900 tabular-nums">
            {warehouse?.positionsOutOfStock ?? 0}
          </p>
          <p className="text-xs text-gray-500">позиций с нулевым остатком</p>
        </CardBlock>
        <CardBlock
          title="Выручка за период"
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
        >
          <p className="text-lg font-semibold text-gray-900 tabular-nums">
            {formatMoney(profit?.totalRevenue)}
          </p>
          <p className="text-xs text-gray-500">за последний месяц</p>
        </CardBlock>
        <CardBlock
          title="Валовая маржа"
          icon={<ChartBarIcon className="h-5 w-5" />}
        >
          <p className="text-lg font-semibold text-gray-900 tabular-nums">
            {formatMoney(profit?.totalGrossMargin)}
          </p>
          <p className="text-xs text-gray-500">за период</p>
        </CardBlock>
        <CardBlock
          title="Кол-во продаж"
          icon={<ShoppingCartIcon className="h-5 w-5" />}
        >
          <p className="text-lg font-semibold text-gray-900 tabular-nums">
            {profit?.saleCount ?? 0}
          </p>
          <p className="text-xs text-gray-500">услуг за месяц</p>
        </CardBlock>
      </section>

      {/* Минимальный остаток — компактная таблица */}
      <section aria-labelledby="low-stock-heading">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
            <h2
              id="low-stock-heading"
              className="text-sm font-medium text-gray-900 flex items-center gap-2"
            >
              <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" aria-hidden />
              Минимальный остаток
              {alerts.length > 0 && (
                <span
                  className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 tabular-nums"
                  aria-label={`Количество позиций: ${alerts.length}`}
                >
                  {alerts.length}
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <Link
                to="/warehouse"
                className="text-xs text-gray-500 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-300 rounded inline-flex items-center gap-1"
              >
                Склад
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </Link>
              <Link
                to="/materials"
                className="text-xs text-gray-500 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-300 rounded inline-flex items-center gap-1"
              >
                Материалы
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="min-w-0 overflow-x-auto">
            {alerts.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-500" role="status">
                Нет позиций ниже порога или с нулевым остатком.
              </p>
            ) : (
              <table className="w-full text-left text-xs table-fixed" role="table" aria-label="Позиции с низким остатком">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col />
                  <col />
                  <col />
                  <col className="w-9" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-medium">
                    <th scope="col" className="py-2 px-3 text-left">Наименование</th>
                    <th scope="col" className="py-2 px-3 text-left">Категория</th>
                    <th scope="col" className="py-2 px-3 text-right bg-red-50/70">Остаток</th>
                    <th scope="col" className="py-2 px-3 text-right bg-slate-100/70">Мин.</th>
                    <th scope="col" className="py-2 px-3 text-right bg-amber-50/70">Не хватает</th>
                    <th scope="col" className="py-2 px-3 text-left w-16">Ед.</th>
                    <th scope="col" className="py-2 px-3 text-right w-20">Ср. цена</th>
                    <th scope="col" className="py-2 px-3 text-right w-24">Докупка ≈</th>
                    <th scope="col" aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr
                      key={a.materialId}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="py-1.5 px-3">
                        <Link
                          to="/warehouse"
                          className="text-gray-900 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 rounded"
                        >
                          {a.materialName}
                        </Link>
                      </td>
                      <td className="py-1.5 px-3 text-gray-500">{a.category || '—'}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums bg-red-50/50">
                        <span className={a.isZero ? 'text-red-600 font-medium' : 'text-amber-700'}>
                          {a.currentQuantity}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right tabular-nums text-gray-500 bg-slate-100/50">
                        {a.minThreshold > 0 ? a.minThreshold : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right tabular-nums text-gray-600 bg-amber-50/50">
                        {a.shortage > 0 ? a.shortage : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-gray-500">{a.unit}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums text-gray-600">
                        {formatMoney(a.averageCost)}
                      </td>
                      <td className="py-1.5 px-3 text-right tabular-nums text-gray-600">
                        {a.estimatedCostToRestock > 0 ? formatMoney(a.estimatedCostToRestock) : '—'}
                      </td>
                      <td className="py-1.5 px-2">
                        <Link
                          to="/warehouse"
                          className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 rounded"
                          aria-label={`Перейти к складу: ${a.materialName}`}
                        >
                          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
