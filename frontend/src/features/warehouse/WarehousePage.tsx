import { useEffect, useState, Fragment } from 'react';
import { Tab, Dialog, Transition } from '@headlessui/react';
import {
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { stockApi, materialTypesApi, materialsApi } from '../../shared/api/client';
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

  // Модальное окно списания (тот же функционал, что «Ручное списание» на странице Продажи)
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffPreset, setWriteOffPreset] = useState<{ materialId: string; category: string; materialLotId: string } | null>(null);
  const [woTypes, setWoTypes] = useState<any[]>([]);
  const [woMaterials, setWoMaterials] = useState<any[]>([]);
  const [woLots, setWoLots] = useState<any[]>([]);
  const [woLotsLoading, setWoLotsLoading] = useState(false);
  const [woForm, setWoForm] = useState({
    category: '',
    materialId: '',
    materialLotId: '',
    quantity: 1,
    reason: '',
    writeOffDate: new Date().toISOString().slice(0, 10),
  });
  const [woSaving, setWoSaving] = useState(false);
  const [woError, setWoError] = useState('');

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

  const writeOffCategories = [...new Set((woTypes || []).map((t: any) => (t?.name ?? '').toString().split(' ')[0]).filter(Boolean))].sort();
  const getMaterialsInCategoryWriteOff = (category: string) => {
    const typeIds = (woTypes || []).filter((t: any) => (t?.name ?? '') === category || (t?.name ?? '').startsWith(category + ' ')).map((t: any) => t.id);
    return woMaterials.filter((m: any) => typeIds.includes(m.materialTypeId ?? m.materialType?.id ?? ''));
  };

  useEffect(() => {
    if (!showWriteOffModal) return;
    Promise.all([materialTypesApi.list(), materialsApi.list()]).then(([t, m]) => {
      setWoTypes(t || []);
      setWoMaterials(m || []);
      const cats = [...new Set((t || []).map((ty: any) => (ty?.name ?? '').toString().split(' ')[0]).filter(Boolean))].sort();
      if (writeOffPreset) {
        const mat = (m || []).find((x: any) => x.id === writeOffPreset.materialId);
        const categoryFromMaterial = mat ? ((mat.materialType?.name ?? '').toString().split(' ')[0] || '').trim() : '';
        const category =
          (categoryFromMaterial && cats.includes(categoryFromMaterial))
            ? categoryFromMaterial
            : cats.includes(writeOffPreset.category)
              ? writeOffPreset.category
              : (cats[0] ?? '');
        setWoForm((f) => ({
          ...f,
          category,
          materialId: writeOffPreset.materialId,
          materialLotId: writeOffPreset.materialLotId ?? '',
        }));
      } else {
        setWoForm((f) => ({
          ...f,
          category: cats[0] ?? '',
          materialId: '',
          materialLotId: '',
          quantity: 1,
          reason: '',
          writeOffDate: new Date().toISOString().slice(0, 10),
        }));
      }
    });
  }, [showWriteOffModal, writeOffPreset]);

  useEffect(() => {
    if (!showWriteOffModal || !woForm.materialId) {
      setWoLots([]);
      return;
    }
    setWoLotsLoading(true);
    stockApi.getLotsByMaterial(woForm.materialId).then(setWoLots).catch(() => setWoLots([])).finally(() => setWoLotsLoading(false));
  }, [showWriteOffModal, woForm.materialId]);

  const openWriteOffModal = (preset: { materialId: string; category: string; materialLotId: string } | null) => {
    setWriteOffPreset(preset);
    setWoError('');
    setWoForm({
      category: preset?.category ?? '',
      materialId: preset?.materialId ?? '',
      materialLotId: preset?.materialLotId ?? '',
      quantity: 1,
      reason: '',
      writeOffDate: new Date().toISOString().slice(0, 10),
    });
    setShowWriteOffModal(true);
  };

  const closeWriteOffModal = () => {
    setShowWriteOffModal(false);
    setWriteOffPreset(null);
  };

  const saveWriteOff = async () => {
    if (!woForm.materialId) {
      setWoError('Выберите категорию и маркировку (бренд) материала');
      return;
    }
    setWoError('');
    setWoSaving(true);
    try {
      await stockApi.createWriteOff({
        materialId: woForm.materialId,
        ...(woForm.materialLotId ? { materialLotId: woForm.materialLotId } : {}),
        quantity: woForm.quantity,
        reason: woForm.reason,
        writeOffDate: woForm.writeOffDate,
      });
      closeWriteOffModal();
      loadInventory();
    } catch (e: any) {
      setWoError(e.response?.data?.message ?? 'Ошибка');
    } finally {
      setWoSaving(false);
    }
  };

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
                                                  openWriteOffModal({
                                                    materialId: m.id,
                                                    category: m.category ?? '',
                                                    materialLotId: lot.id,
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

      <Transition show={showWriteOffModal} as={Fragment}>
        <Dialog onClose={closeWriteOffModal} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4">
                <Dialog.Title className="text-base font-semibold text-gray-900">Списание</Dialog.Title>
                <p className="text-xs text-gray-500 mt-1 mb-3">Категория → маркировка (бренд) материала для списания.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Материал и объём</p>
                    <div className="space-y-2">
                      <ListboxSelect
                        label="Категория"
                        value={woForm.category}
                        options={writeOffCategories.map((g) => ({ id: g, name: g }))}
                        onChange={(id) => setWoForm((f) => ({ ...f, category: id, materialId: '', materialLotId: '' }))}
                        placeholder="Напр. Адгезив"
                      />
                      <ListboxSelect
                        label="Маркировка (Бренд)"
                        value={woForm.materialId}
                        options={getMaterialsInCategoryWriteOff(woForm.category).map((mat: any) => ({ id: mat.id, name: mat.name }))}
                        onChange={(id) => setWoForm((f) => ({ ...f, materialId: id, materialLotId: '' }))}
                        placeholder="Конкретный материал"
                      />
                      {woForm.materialId && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Партия (поставщик)</label>
                          <ListboxSelect
                            value={woForm.materialLotId}
                            options={[
                              { id: '', name: 'Не указывать (по FIFO / средней)' },
                              ...woLots.map((l: any) => ({
                                id: l.id,
                                name: `${l.supplierName}, остаток ${Number(l.quantity).toLocaleString('ru-RU')}, срок ${l.expiryDate ? new Date(l.expiryDate).toLocaleDateString('ru-RU') : '—'}`,
                              })),
                            ]}
                            onChange={(id) => setWoForm((f) => ({ ...f, materialLotId: id }))}
                            placeholder={woLotsLoading ? 'Загрузка…' : 'Выберите партию или оставьте по FIFO/средней'}
                            buttonClassName="py-1.5 text-xs border border-gray-200 rounded"
                          />
                          <p className="text-[11px] text-gray-500 mt-0.5">Укажите партию, чтобы списать именно с неё; иначе списание по настройкам склада.</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Количество</label>
                        <span className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0.001}
                            step={0.01}
                            className="border border-gray-200 rounded px-2 py-1.5 text-sm flex-1 max-w-[120px]"
                            value={woForm.quantity}
                            onChange={(e) => setWoForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                          />
                          <span className="text-sm text-gray-500">{woMaterials.find((mat: any) => mat.id === woForm.materialId)?.unit ?? 'шт'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Причина и дата</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Причина</label>
                        <input
                          className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full"
                          placeholder="Брак, порча, истёк срок…"
                          value={woForm.reason}
                          onChange={(e) => setWoForm((f) => ({ ...f, reason: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Дата списания</label>
                        <input
                          type="date"
                          className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full"
                          value={woForm.writeOffDate}
                          onChange={(e) => setWoForm((f) => ({ ...f, writeOffDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {woError && <p className="mt-3 text-sm text-gray-700 rounded bg-gray-100 px-3 py-1.5" role="alert">{woError}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                  <button type="button" onClick={closeWriteOffModal} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ArrowLeftIcon className="h-4 w-4" /> Назад
                  </button>
                  <button type="button" onClick={saveWriteOff} className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50" disabled={woSaving}>
                    {woSaving ? 'Сохранение…' : 'Списать'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
