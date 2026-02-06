import { useEffect, useState, Fragment } from 'react';
import { Tab } from '@headlessui/react';
import {
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

const SOURCE_LABEL: Record<string, string> = {
  STOCK_ENTRY: 'Приход',
  WRITE_OFF: 'Списание',
  SERVICE_SALE: 'Продажа услуги',
};

export function WarehousePage() {
  const [inventoryWithLots, setInventoryWithLots] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [movementsFrom, setMovementsFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [movementsTo, setMovementsTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadInventory = () => {
    setLoading(true);
    stockApi.getInventoryWithLots().then(setInventoryWithLots).finally(() => setLoading(false));
  };

  useEffect(() => loadInventory(), []);

  const loadMovements = () => {
    stockApi
      .getMovements({ from: movementsFrom, to: movementsTo, limit: 500 })
      .then(setMovements);
  };

  useEffect(() => {
    if (movementsFrom && movementsTo) loadMovements();
  }, [movementsFrom, movementsTo]);

  const toggleExpand = (materialId: string) => {
    setExpandedMaterialId((prev) => (prev === materialId ? null : materialId));
  };

  const categories = [...new Set((inventoryWithLots || []).map((m: any) => m.category).filter(Boolean))].sort();
  const categoryCounts: Record<string, number> = {};
  (inventoryWithLots || []).forEach((m: any) => {
    const cat = m.category || 'Прочее';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const filteredInventory = (inventoryWithLots || []).filter((m: any) => {
    if (selectedCategory && m.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!m.name?.toLowerCase().includes(q) && !(m.category ?? '').toLowerCase().includes(q)) return false;
    }
    if (lowStockOnly) {
      const min = Number(m.minStockThreshold ?? 0);
      if (min <= 0 || m.currentQuantity >= min) return false;
    }
    return true;
  });

  const formatDate = (d: string | Date) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  if (loading && inventoryWithLots.length === 0) {
    return (
      <>
        <PageHeader title="Склад" breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Склад' }]} />
        <p className="text-sm text-gray-500">Загрузка…</p>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Склад"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Склад' }]}
      />

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Категории</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={classNames(
              'rounded-lg border-2 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300',
              !selectedCategory ? 'border-gray-300 bg-white' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
            )}
          >
            <span className="block text-sm font-semibold text-gray-900">Все</span>
            <span className="block mt-0.5 text-xs text-gray-500">{inventoryWithLots?.length ?? 0} позиций</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={classNames(
                'rounded-lg border-2 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300',
                selectedCategory === cat ? 'border-gray-300 bg-white' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
              )}
            >
              <span className="block text-sm font-semibold text-gray-900">{cat}</span>
              <span className="block mt-0.5 text-xs text-gray-500">{categoryCounts[cat] ?? 0} поз.</span>
            </button>
          ))}
        </div>
      </section>

      <Tab.Group>
        <Tab.List className="flex gap-0.5 rounded-lg border border-gray-100 bg-white p-0.5 max-w-md">
          <Tab
            className={({ selected }) =>
              classNames(
                'flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                selected ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )
            }
          >
            <LinkIcon className="h-4 w-4" />
            Склад материалов
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                selected ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )
            }
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Движения
          </Tab>
        </Tab.List>

        <Tab.Panels className="mt-3">
          {/* Цепочка: остатки + партии + движения в одном табе с раскрывающимися строками */}
          <Tab.Panel className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по названию или категории…"
                  className="input w-full pl-8 py-1.5 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                />
                Только с низким остатком
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="w-8 py-2.5 px-2 text-left" aria-label="Развернуть" />
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Категория</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Маркировка (Бренд)</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Ед.</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Остаток</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Ср. себестоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                        Нет позиций на складе по выбранным фильтрам
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((m: any) => (
                      <Fragment key={m.id}>
                        <tr
                          className={classNames(
                            'hover:bg-gray-50/50 cursor-pointer',
                            expandedMaterialId === m.id && 'bg-gray-50'
                          )}
                          onClick={() => toggleExpand(m.id)}
                        >
                          <td className="py-2 px-2 text-gray-400">
                            {expandedMaterialId === m.id ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-600">{m.category}</td>
                          <td className="py-2 px-3 font-medium text-gray-900">{m.name}</td>
                          <td className="py-2 px-3 text-gray-600">{m.unit}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {Number(m.currentQuantity).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">{formatMoney(m.averageCost)}</td>
                        </tr>
                        {expandedMaterialId === m.id && (
                          <tr className="bg-gray-50/80">
                            <td colSpan={6} className="py-3 px-3">
                              <div className="space-y-4 pl-2 border-l-2 border-gray-200">
                                {/* Партии: поставщик, кол-во, дата прихода, срок годности */}
                                {m.lots?.length > 0 ? (
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-2">Партии (поставщик, срок годности)</p>
                                    <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden bg-white">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="text-left py-1.5 px-2 font-medium text-gray-500">Поставщик</th>
                                          <th className="text-right py-1.5 px-2 font-medium text-gray-500">Кол-во</th>
                                          <th className="text-left py-1.5 px-2 font-medium text-gray-500">Дата прихода</th>
                                          <th
                                            className="text-left py-1.5 px-2 font-medium text-gray-500"
                                            title="При приходе можно не указывать — тогда по партии считается, что срока годности нет."
                                          >
                                            Срок годности
                                          </th>
                                          <th className="w-20 py-1.5 px-2 font-medium text-gray-500 text-right">Списание</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {m.lots.map((lot: any) => (
                                          <tr key={lot.id}>
                                            <td className="py-1.5 px-2 text-gray-900">{lot.supplierName}</td>
                                            <td className="py-1.5 px-2 text-right tabular-nums">{Number(lot.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</td>
                                            <td className="py-1.5 px-2 text-gray-700">{formatDate(lot.receivedAt)}</td>
                                            <td className="py-1.5 px-2 text-gray-700">{formatDate(lot.expiryDate)}</td>
                                            <td className="py-1.5 px-2 text-right">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate('/sales', {
                                                    state: {
                                                      writeOffPreset: {
                                                        materialId: m.id,
                                                        materialName: m.name,
                                                        category: m.category,
                                                        materialLotId: lot.id,
                                                      },
                                                    },
                                                  });
                                                }}
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3882EC] focus-visible:ring-offset-1"
                                              >
                                                <ArrowUpTrayIcon className="h-3 w-3" />
                                                Списание
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500">Партии не ведутся (учёт по средней) или партий нет.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Tab.Panel>

          {/* Движения (общий журнал за период) */}
          <Tab.Panel className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Период:</span>
              <input
                type="date"
                className="input w-36 py-1.5 text-sm"
                value={movementsFrom}
                onChange={(e) => setMovementsFrom(e.target.value)}
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                className="input w-36 py-1.5 text-sm"
                value={movementsTo}
                onChange={(e) => setMovementsTo(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Дата</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Материал</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Тип</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Источник</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Кол-во</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Цена</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 text-sm">
                        Нет движений за период
                      </td>
                    </tr>
                  ) : (
                    movements.map((mov: any) => {
                      const q = Number(mov.quantity);
                      const c = Number(mov.unitCost);
                      const sum = q * c;
                      return (
                        <tr key={mov.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-gray-700">{formatDate(mov.movementDate)}</td>
                          <td className="py-2 px-3 font-medium text-gray-900">{mov.material?.name ?? mov.materialId}</td>
                          <td className="py-2 px-3">
                            <span className={mov.type === 'IN' ? 'text-green-700' : 'text-amber-700'}>
                              {mov.type === 'IN' ? (
                                <span className="inline-flex items-center gap-0.5"><ArrowLeftOnRectangleIcon className="h-3.5 w-3.5" /> Приход</span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5"><ArrowRightOnRectangleIcon className="h-3.5 w-3.5" /> Расход</span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-600">{SOURCE_LABEL[mov.sourceType] ?? mov.sourceType}</td>
                          <td className="py-2 px-3 text-right">{q.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-right">{formatMoney(c)}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatMoney(sum)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
