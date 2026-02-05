import { useEffect, useState } from 'react';
import { Tab } from '@headlessui/react';
import {
  CubeIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { materialsApi, materialTypesApi, stockApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';
import { ListboxSelect } from '../../shared/ListboxSelect';

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

const SOURCE_LABEL: Record<string, string> = {
  STOCK_ENTRY: 'Приход',
  WRITE_OFF: 'Списание',
  SERVICE_SALE: 'Продажа услуги',
};

export function WarehousePage() {
  const [types, setTypes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [movementsFrom, setMovementsFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [movementsTo, setMovementsTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [chainMaterialId, setChainMaterialId] = useState<string>('');
  const [chainMovements, setChainMovements] = useState<any[]>([]);

  const loadBase = () => {
    setLoading(true);
    Promise.all([
      materialTypesApi.list(),
      materialsApi.list(),
    ])
      .then(([t, mats]) => {
        setTypes(t || []);
        setInventory(mats || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => loadBase(), []);

  const loadMovements = () => {
    stockApi.getMovements({
      from: movementsFrom,
      to: movementsTo,
      limit: 500,
    }).then(setMovements);
  };

  useEffect(() => {
    if (movementsFrom && movementsTo) loadMovements();
  }, [movementsFrom, movementsTo]);

  const loadChain = () => {
    if (!chainMaterialId) {
      setChainMovements([]);
      return;
    }
    stockApi.getMovements({
      materialId: chainMaterialId,
      limit: 200,
    }).then(setChainMovements);
  };

  useEffect(() => {
    loadChain();
  }, [chainMaterialId]);

  const categories = [...new Set((types || []).map((t: any) => t.name.split(' ')[0]).filter(Boolean))].sort();
  const categoryCounts: Record<string, number> = {};
  (inventory || []).forEach((m: any) => {
    const typeName = m.materialType?.name ?? '';
    const cat = typeName.split(' ')[0] || 'Прочее';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const filteredInventory = (inventory || []).filter((m: any) => {
    const cat = (m.materialType?.name ?? '').split(' ')[0] || '';
    if (selectedCategory && cat !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!m.name?.toLowerCase().includes(q) && !cat.toLowerCase().includes(q)) return false;
    }
    if (lowStockOnly) {
      const qty = Number(m.currentQuantity ?? 0);
      const min = Number(m.minStockThreshold ?? 0);
      if (min <= 0 || qty >= min) return false;
    }
    return true;
  });

  const materialOptions = (inventory || []).map((m: any) => ({
    id: m.id,
    name: `${m.name} (${m.unit})`,
  }));

  if (loading) {
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

      {/* Карточки категорий */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Категории</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={classNames(
              'rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
              !selectedCategory
                ? 'border-gray-300 bg-white shadow-sm'
                : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-white'
            )}
          >
            <span className="block text-sm font-semibold text-gray-900">Все</span>
            <span className="block mt-0.5 text-xs text-gray-500">{inventory?.length ?? 0} позиций</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={classNames(
                'rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                selectedCategory === cat
                  ? 'border-gray-300 bg-white shadow-sm'
                  : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-white'
              )}
            >
              <span className="block text-sm font-semibold text-gray-900">{cat}</span>
              <span className="block mt-0.5 text-xs text-gray-500">{categoryCounts[cat] ?? 0} позиций</span>
            </button>
          ))}
        </div>
      </section>

      {/* Табы */}
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
            <CubeIcon className="h-4 w-4" />
            Остатки
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
          <Tab
            className={({ selected }) =>
              classNames(
                'flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                selected ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )
            }
          >
            <LinkIcon className="h-4 w-4" />
            Цепочка
          </Tab>
        </Tab.List>

        <Tab.Panels className="mt-3">
          {/* Остатки */}
          <Tab.Panel className="rounded-xl border border-gray-100 bg-white overflow-hidden">
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
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Категория</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Маркировка (Бренд)</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Ед. учета</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Остаток</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Ср. себестоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                        Нет позиций по выбранным фильтрам
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((m: any) => (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 text-gray-600">{(m.materialType?.name ?? '').split(' ')[0] || '—'}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{m.name}</td>
                        <td className="py-2 px-3 text-gray-600">{m.unit}</td>
                        <td className="py-2 px-3 text-right">{Number(m.currentQuantity ?? 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right">{formatMoney(Number(m.averageCost ?? 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Tab.Panel>

          {/* Движения */}
          <Tab.Panel className="rounded-xl border border-gray-100 bg-white overflow-hidden">
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
                          <td className="py-2 px-3 text-gray-700">{new Date(mov.movementDate).toLocaleDateString('ru-RU')}</td>
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

          {/* Цепочка */}
          <Tab.Panel className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Материал для отслеживания цепочки</label>
              <ListboxSelect
                value={chainMaterialId}
                options={materialOptions}
                onChange={setChainMaterialId}
                placeholder="Выберите материал…"
                buttonClassName="w-full max-w-md py-2"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Дата</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Тип</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Источник</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Кол-во</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Цена</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!chainMaterialId ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                        Выберите материал, чтобы увидеть цепочку приходов и списаний
                      </td>
                    </tr>
                  ) : chainMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                        Нет движений по этому материалу
                      </td>
                    </tr>
                  ) : (
                    chainMovements.map((mov: any) => {
                      const q = Number(mov.quantity);
                      const c = Number(mov.unitCost);
                      const sum = q * c;
                      return (
                        <tr key={mov.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-gray-700">{new Date(mov.movementDate).toLocaleDateString('ru-RU')}</td>
                          <td className="py-2 px-3">
                            <span className={mov.type === 'IN' ? 'text-green-700' : 'text-amber-700'}>
                              {mov.type === 'IN' ? 'Приход' : 'Расход'}
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
