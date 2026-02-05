import { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { reportsApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';
import { CardBlock } from '../../shared/CardBlock';

const defaultFrom = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const defaultTo = () => new Date().toISOString().slice(0, 10);

export function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [profit, setProfit] = useState<any>(null);
  const [consumption, setConsumption] = useState<any[]>([]);
  const [serviceProfit, setServiceProfit] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [margin, setMargin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsApi.profitByPeriod(from, to),
      reportsApi.materialConsumption(from, to),
      reportsApi.serviceProfitability(from, to),
      reportsApi.inventoryBalance(),
      reportsApi.lowStockAlerts(),
      reportsApi.marginAnalysis(from, to),
    ])
      .then(([p, c, sp, inv, a, m]) => {
        setProfit(p);
        setConsumption(c);
        setServiceProfit(sp);
        setInventory(inv);
        setAlerts(a);
        setMargin(m);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) {
    return (
      <>
        <PageHeader title="Отчёты" breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Отчёты' }]} />
        <p className="text-xs text-gray-500">Загрузка отчётов…</p>
      </>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Отчёты"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Отчёты' }]}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
        <span className="text-xs font-medium text-gray-700">Период:</span>
        <input
          type="date"
          className="input w-36 py-1.5 text-sm"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span className="text-gray-400 text-xs">—</span>
        <input type="date" className="input w-36 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <CardBlock title="Прибыль за период" icon={<CurrencyDollarIcon className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500">Выручка</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">{formatMoney(Number(profit?.totalRevenue ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Себестоимость материалов</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">{formatMoney(Number(profit?.totalMaterialCost ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Валовая маржа</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">{formatMoney(Number(profit?.totalGrossMargin ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Кол-во продаж</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">{profit?.saleCount ?? 0}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500">Закупки (материалы)</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{formatMoney(Number(profit?.totalPurchaseCost ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Оплата доставки</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{formatMoney(Number(profit?.totalDeliveryCost ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Итого расходы на закупки</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{formatMoney(Number(profit?.totalPurchaseExpenses ?? 0))}</p>
          </div>
        </div>
      </CardBlock>

      <CardBlock title="Анализ маржинальности" icon={<ChartBarIcon className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500">Средний % маржи</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">{margin?.avgMarginPercent?.toFixed(1) ?? 0}%</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Общая маржа</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">{formatMoney(Number(margin?.totalMargin ?? 0))}</p>
          </div>
        </div>
      </CardBlock>

      <CardBlock title="Рентабельность услуг" icon={<ArrowTrendingUpIcon className="h-4 w-4" />}>
        <div className="table-wrap -mx-3 -mb-3">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-head">Услуга</th>
                <th className="table-head text-right">Продаж</th>
                <th className="table-head text-right">Выручка</th>
                <th className="table-head text-right">Маржа</th>
                <th className="table-head text-right">% маржи</th>
              </tr>
            </thead>
            <tbody>
              {serviceProfit.map((s) => (
                <tr key={s.serviceId} className="hover:bg-gray-50/50">
                  <td className="table-cell font-medium">{s.serviceName}</td>
                  <td className="table-cell text-right">{s.saleCount}</td>
                  <td className="table-cell text-right">{formatMoney(s.totalRevenue)}</td>
                  <td className="table-cell text-right">{formatMoney(s.totalMargin)}</td>
                  <td className="table-cell text-right">{s.avgMarginPercent?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBlock>

      <CardBlock title="Расход материалов за период" icon={<CubeIcon className="h-4 w-4" />}>
        <div className="table-wrap -mx-3 -mb-3">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-head">Материал</th>
                <th className="table-head text-right">Кол-во</th>
                <th className="table-head text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {consumption.map((c) => (
                <tr key={c.materialId} className="hover:bg-gray-50/50">
                  <td className="table-cell font-medium">{c.materialName}</td>
                  <td className="table-cell text-right">{c.quantity?.toLocaleString('ru-RU')}</td>
                  <td className="table-cell text-right">{formatMoney(c.cost ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBlock>

      <CardBlock title="Остатки на складе" icon={<CubeIcon className="h-4 w-4" />}>
        <div className="table-wrap -mx-3 -mb-3">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-head">Материал</th>
                <th className="table-head">Категория</th>
                <th className="table-head text-right">Кол-во</th>
                <th className="table-head text-right">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50/50">
                  <td className="table-cell font-medium">{i.name}</td>
                  <td className="table-cell-muted">{i.category}</td>
                  <td className="table-cell text-right">{i.quantity?.toLocaleString('ru-RU')}</td>
                  <td className="table-cell text-right">{formatMoney(i.totalValue ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBlock>

      {alerts.length > 0 && (
        <CardBlock title="Низкий остаток" icon={<ExclamationTriangleIcon className="h-4 w-4" />}>
          <ul className="divide-y divide-gray-200" role="list">
            {alerts.map((a) => (
              <li key={a.materialId} className="flex justify-between py-2 first:pt-0 last:pb-0 text-xs">
                <span className="font-medium text-gray-900">{a.materialName}</span>
                <span className="text-gray-500">Остаток: {a.currentQuantity}, мин. порог: {a.minThreshold}</span>
              </li>
            ))}
          </ul>
        </CardBlock>
      )}
    </div>
  );
}
