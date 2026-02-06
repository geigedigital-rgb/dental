import { useEffect, useState, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tab, Dialog, Transition } from '@headlessui/react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ShoppingCartIcon, ArrowLeftIcon, TrashIcon, CheckIcon, PencilSquareIcon, ClockIcon } from '@heroicons/react/24/outline';
import { stockApi, salesApi, suppliersApi, materialsApi, materialTypesApi, servicesApi, reportsApi, settingsApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';
import { CardBlock } from '../../shared/CardBlock';
import { ListboxSelect } from '../../shared/ListboxSelect';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function SalesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [writeOffPreset, setWriteOffPreset] = useState<{ materialId: string; materialName: string; category: string } | null>(null);

  useEffect(() => {
    const preset = (location.state as any)?.writeOffPreset;
    if (preset?.materialId) {
      setTabIndex(1);
      setWriteOffPreset(preset);
    }
  }, [location.state]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Продажи и списания"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Продажи и списания' }]}
      />
      <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
        <Tab.List className="flex gap-0.5 rounded-lg border border-gray-100 bg-white p-0.5 max-w-md">
          <Tab
            className={({ selected }) =>
              classNames(
                'rounded px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                selected ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 ui-not-selected:hover:text-gray-700'
              )
            }
          >
            Приходы
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'rounded px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                selected ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 ui-not-selected:hover:text-gray-700'
              )
            }
          >
            Списания
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'rounded px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                selected ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 ui-not-selected:hover:text-gray-700'
              )
            }
          >
            Продажи услуг
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-2 focus:outline-none">
          <Tab.Panel><StockEntriesPanel /></Tab.Panel>
          <Tab.Panel><WriteOffsPanel writeOffPreset={writeOffPreset} onConsumePreset={() => { setWriteOffPreset(null); navigate(location.pathname, { replace: true, state: {} }); }} /></Tab.Panel>
          <Tab.Panel><ServiceSalesPanel /></Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

function StockEntriesPanel() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [invSettings, setInvSettings] = useState<{ writeOffMethod: string; lotTracking: boolean } | null>(null);
  const [detailEntry, setDetailEntry] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showEntryDetailModal, setShowEntryDetailModal] = useState(false);
  const [entryDetailError, setEntryDetailError] = useState('');
  const [entryDetailEdit, setEntryDetailEdit] = useState({ note: '', entryDate: '', deliveryCost: '' });
  const [entryHistoryLogs, setEntryHistoryLogs] = useState<any[]>([]);
  const [entryHistoryLoading, setEntryHistoryLoading] = useState(false);
  const [showDeleteEntryConfirm, setShowDeleteEntryConfirm] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    entryDate: new Date().toISOString().slice(0, 10),
    note: '',
    deliveryCost: '' as string,
    items: [] as { category: string; materialId: string; quantity: string; unitPrice: string; expiryDate: string }[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const showExpiry = invSettings?.lotTracking || invSettings?.writeOffMethod === 'FIFO';

  const entryCategories = [...new Set((types || []).map((t: any) => (t?.name ?? '').toString().split(' ')[0]).filter(Boolean))].sort();
  const getMaterialsInCategoryEntry = (category: string) => {
    const typeIds = (types || []).filter((t: any) => (t?.name ?? '') === category || (t?.name ?? '').startsWith(category + ' ')).map((t: any) => t.id);
    return materials.filter((m: any) => typeIds.includes(m.materialTypeId ?? m.materialType?.id ?? ''));
  };

  const load = () => {
    setLoading(true);
    stockApi.getEntries().then(setEntries).finally(() => setLoading(false));
  };
  const loadInitial = () => {
    setLoading(true);
    Promise.allSettled([
      stockApi.getEntries(),
      suppliersApi.list(),
      materialTypesApi.list(),
      materialsApi.list(),
      settingsApi.getInventory(),
    ]).then(([e, s, t, m, inv]) => {
      if (e.status === 'fulfilled') setEntries(e.value);
      if (s.status === 'fulfilled') setSuppliers(s.value ?? []);
      if (t.status === 'fulfilled') setTypes(t.value ?? []);
      if (m.status === 'fulfilled') setMaterials(m.value ?? []);
      if (inv.status === 'fulfilled') setInvSettings(inv.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadEntryHistory = () => {
    setEntryHistoryLoading(true);
    reportsApi.operationLog({ entityType: 'STOCK_ENTRY', limit: 80 }).then(setEntryHistoryLogs).finally(() => setEntryHistoryLoading(false));
  };
  useEffect(() => { loadEntryHistory(); }, []);

  const openEntryDetail = (e: any) => {
    setDetailEntry(null);
    setEntryDetailError('');
    setEntryDetailEdit({
      note: e.note ?? '',
      entryDate: e.entryDate ? new Date(e.entryDate).toISOString().slice(0, 10) : '',
      deliveryCost: e.deliveryCost != null ? String(e.deliveryCost) : '',
    });
    setShowEntryDetailModal(true);
    setDetailLoading(true);
    stockApi.getEntry(e.id).then((data) => {
      setDetailEntry(data);
      setEntryDetailEdit({
        note: data.note ?? '',
        entryDate: data.entryDate ? new Date(data.entryDate).toISOString().slice(0, 10) : '',
        deliveryCost: data.deliveryCost != null ? String(data.deliveryCost) : '',
      });
    }).catch((err) => setEntryDetailError(err.response?.data?.message ?? 'Ошибка загрузки')).finally(() => setDetailLoading(false));
  };

  const saveEntryDetailEdit = async () => {
    if (!detailEntry) return;
    setEntryDetailError('');
    try {
      await stockApi.updateEntry(detailEntry.id, {
        note: entryDetailEdit.note || undefined,
        entryDate: entryDetailEdit.entryDate || undefined,
        deliveryCost: entryDetailEdit.deliveryCost ? Number(entryDetailEdit.deliveryCost) : undefined,
      });
      setDetailEntry((prev: any) => prev && { ...prev, note: entryDetailEdit.note, entryDate: entryDetailEdit.entryDate, deliveryCost: entryDetailEdit.deliveryCost });
      load();
      loadEntryHistory();
    } catch (err: any) {
      setEntryDetailError(err.response?.data?.message ?? 'Ошибка');
    }
  };

  const openDeleteEntryConfirm = () => {
    if (detailEntry) setShowDeleteEntryConfirm(true);
  };
  const deleteEntryDetail = async () => {
    if (!detailEntry) return;
    setEntryDetailError('');
    try {
      await stockApi.deleteEntry(detailEntry.id);
      setShowDeleteEntryConfirm(false);
      setShowEntryDetailModal(false);
      setDetailEntry(null);
      load();
      loadEntryHistory();
    } catch (err: any) {
      setEntryDetailError(err.response?.data?.message ?? 'Ошибка');
    }
  };

  const openCreate = () => {
    if (suppliers.length === 0) {
      suppliersApi.list().then((list) => {
        setSuppliers(list ?? []);
        setForm((f) => ({ ...f, supplierId: (list?.[0]?.id) ?? '' }));
      }).catch(() => {});
    }
    setForm((f) => ({
      ...f,
      supplierId: suppliers[0]?.id ?? f.supplierId,
      entryDate: new Date().toISOString().slice(0, 10),
      note: '',
      deliveryCost: '',
      items: [],
    }));
    setError('');
    setShowForm(true);
  };

  const addItem = () => {
    const firstCat = entryCategories[0] ?? '';
    setForm((f) => ({ ...f, items: [...f.items, { category: firstCat, materialId: '', quantity: '1', unitPrice: '', expiryDate: '' }] }));
  };

  const toNum = (v: any): number => {
    if (v == null || v === '') return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const updateItem = (i: number, field: string, value: any) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((row, idx) => {
        if (idx !== i) return row;
        if (field === 'category') return { ...row, category: value, materialId: '' };
        if (field === 'materialId') return { ...row, materialId: value };
        if (field === 'expiryDate') return { ...row, expiryDate: value };
        if (field === 'quantity' || field === 'unitPrice') return { ...row, [field]: typeof value === 'string' ? value : String(value ?? '') };
        return row;
      }),
    }));
  };

  const removeItem = (i: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  };

  const save = async () => {
    const qtyMin = 0.0001;
    const validItems = form.items.filter(
      (r) => r.materialId && toNum(r.quantity) >= qtyMin && toNum(r.unitPrice) >= 0,
    );
    if (!form.supplierId || !validItems.length) {
      setError('Укажите поставщика и хотя бы одну позицию с количеством и ценой');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const ratioByMaterial = (id: string) => Math.max(0.0001, Number(materials.find((m: any) => m.id === id)?.purchaseUnitRatio ?? 1));
      const deliveryNum = toNum(form.deliveryCost);
      await stockApi.createEntry({
        supplierId: form.supplierId,
        entryDate: form.entryDate,
        note: form.note || undefined,
        ...(deliveryNum > 0 ? { deliveryCost: deliveryNum } : {}),
        items: validItems.map((r) => {
          const ratio = ratioByMaterial(r.materialId);
          const qtyPurchase = Math.max(qtyMin, toNum(r.quantity));
          const pricePerPurchase = Math.max(0, toNum(r.unitPrice));
          const quantityStock = qtyPurchase * ratio;
          const unitPriceStock = ratio > 0 ? pricePerPurchase / ratio : 0;
          return {
            materialId: String(r.materialId),
            quantity: Number(quantityStock),
            unitPrice: Number(unitPriceStock),
            ...(r.expiryDate ? { expiryDate: r.expiryDate } : {}),
          };
        }),
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));
  const entryCategoryOptions = entryCategories.map((g) => ({ id: g, name: g }));

  if (showForm) {
    return (
      <div className="space-y-2">
        <CardBlock title="Приходная накладная" icon={<ArrowDownTrayIcon className="h-4 w-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
              <p className="text-[11px] font-medium text-gray-500 mb-1.5">Общие данные</p>
              <div className="space-y-1.5">
                <div>
                  <label className="label text-xs">Поставщик</label>
                  <ListboxSelect
                    value={form.supplierId}
                    options={supplierOptions}
                    onChange={(id) => setForm((f) => ({ ...f, supplierId: id }))}
                    placeholder={supplierOptions.length === 0 ? 'Загрузка…' : 'Выберите поставщика'}
                    buttonClassName="py-1.5 text-sm"
                  />
                </div>
                {supplierOptions.length === 0 && (
                  <p className="text-[11px] text-gray-500">
                    Список не загрузился.{' '}
                    <button type="button" onClick={loadInitial} className="text-blue-600 hover:underline">Обновить</button>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="label text-xs">Дата</label>
                    <input type="date" className="input w-full py-1.5 text-sm" value={form.entryDate} onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label text-xs">Доставка (грн)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input w-full py-1.5 text-sm"
                      placeholder="0"
                      value={form.deliveryCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(',', '.');
                        if (v === '' || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, deliveryCost: v }));
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Примечание</label>
                  <input className="input py-1.5 text-sm placeholder-gray-400" placeholder="—" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="md:col-span-4 rounded-lg border border-gray-100 bg-white p-2.5">
              <p className="text-[11px] font-medium text-gray-500 mb-0.5">Позиции накладной</p>
              <p className="text-[11px] text-gray-500 mb-1.5">Вносите как в накладной: кол-во и цену в ед. закупки. На склад пересчитается в ед. учета автоматически.</p>
              <div className="rounded-lg border border-gray-100 overflow-visible">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Категория</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Маркировка (Бренд)</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-700 w-24">Кол-во (ед. закупки)</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-700 w-28">Цена за ед. закупки (грн)</th>
                      {showExpiry && (
                              <th
                                className="text-left py-1.5 px-2 font-semibold text-gray-700 w-28"
                                title="Оставьте пустым, если у материала нет срока годности. Указывается для партии при учёте по FEFO."
                              >
                                Срок годности
                              </th>
                            )}
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan={showExpiry ? 6 : 5} className="py-6 text-center text-xs text-gray-500">
                          Нет позиций. Добавьте строку кнопкой ниже.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((row, i) => (
                        <tr key={i} className="bg-white hover:bg-gray-50/50">
                          <td className="py-1.5 px-2">
                            <ListboxSelect
                              value={row.category}
                              options={entryCategoryOptions}
                              onChange={(id) => updateItem(i, 'category', id)}
                              placeholder="Категория"
                              className="min-w-0"
                              buttonClassName="py-1 text-xs border border-gray-100 rounded hover:border-gray-200"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <ListboxSelect
                              value={row.materialId}
                              options={getMaterialsInCategoryEntry(row.category).map((m: any) => ({ id: m.id, name: m.name }))}
                              onChange={(id) => updateItem(i, 'materialId', id)}
                              placeholder="Маркировка (Бренд)"
                              className="min-w-0"
                              buttonClassName="py-1 text-xs border border-gray-100 rounded hover:border-gray-200"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <span className="inline-flex flex-col items-end gap-0.5">
                              <span className="inline-flex items-center justify-end gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="input py-1 text-right w-14 inline-block text-sm border-gray-100"
                                  placeholder="0"
                                  value={row.quantity}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(',', '.');
                                    if (v === '' || /^\d*\.?\d*$/.test(v)) updateItem(i, 'quantity', v);
                                  }}
                                  aria-label="Количество в ед. закупки"
                                />
                                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">{(materials.find((m: any) => m.id === row.materialId)?.purchaseUnit || materials.find((m: any) => m.id === row.materialId)?.unit) ?? '—'}</span>
                              </span>
                              {(materials.find((m: any) => m.id === row.materialId)?.purchaseUnitRatio ?? 1) !== 1 && row.materialId && (
                                <span className="text-[10px] text-gray-400">→ на склад: {(toNum(row.quantity)) * Number((materials.find((m: any) => m.id === row.materialId)?.purchaseUnitRatio) ?? 1)} {(materials.find((m: any) => m.id === row.materialId)?.unit) ?? 'ед.'}</span>
                              )}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="input py-1 text-right w-full max-w-[90px] ml-auto inline-block text-sm border-gray-100"
                              placeholder="0"
                              value={row.unitPrice}
                              onChange={(e) => {
                                const v = e.target.value.replace(',', '.');
                                if (v === '' || /^\d*\.?\d*$/.test(v)) updateItem(i, 'unitPrice', v);
                              }}
                              aria-label="Цена за ед. закупки"
                            />
                          </td>
                          {showExpiry && (
                            <td className="py-1.5 px-2">
                              <input
                                type="date"
                                className="input py-1 text-sm border-gray-100 w-full max-w-[120px]"
                                value={row.expiryDate}
                                onChange={(e) => updateItem(i, 'expiryDate', e.target.value)}
                                aria-label="Срок годности"
                                title="Оставьте пустым, если срока годности нет"
                              />
                            </td>
                          )}
                          <td className="py-1.5 px-1">
                            <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-colors" aria-label="Удалить">×</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-1.5">
                <button type="button" onClick={addItem} className="text-xs font-medium rounded-md px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1">+ Строка</button>
              </div>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-gray-700 rounded bg-gray-100 px-2 py-1" role="alert">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary inline-flex items-center gap-1 text-xs py-1.5 px-2.5">
              <ArrowLeftIcon className="h-3.5 w-3.5" /> Назад
            </button>
            <button type="button" onClick={save} className="btn-primary text-xs py-1.5 px-2.5" disabled={saving}>{saving ? 'Сохранение…' : 'Провести'}</button>
          </div>
        </CardBlock>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={openCreate} className="btn-primary">
        Оформить приход
      </button>
      <CardBlock title="Приходные накладные" icon={<ArrowDownTrayIcon className="h-4 w-4" />}>
        {loading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-head">Дата</th>
                  <th className="table-head">Поставщик</th>
                  <th className="table-head text-right">Позиций</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openEntryDetail(e)}>
                    <td className="table-cell">{new Date(e.entryDate).toLocaleDateString('ru-RU')}</td>
                    <td className="table-cell font-medium">{e.supplier?.name ?? '—'}</td>
                    <td className="table-cell text-right">{e.items?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBlock>

      <CardBlock title="История (приходы)" icon={<ClockIcon className="h-4 w-4" />}>
        {entryHistoryLoading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="table-head">Дата и время</th>
                  <th className="table-head">Действие</th>
                  <th className="table-head">Запись</th>
                  <th className="table-head">Пользователь</th>
                </tr>
              </thead>
              <tbody>
                {entryHistoryLogs.length === 0 ? (
                  <tr><td colSpan={4} className="table-cell text-center text-gray-500 py-4">Нет записей</td></tr>
                ) : (
                  entryHistoryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="table-cell">{new Date(log.createdAt).toLocaleString('ru-RU')}</td>
                      <td className="table-cell">
                        <span className={log.action === 'CREATED' ? 'text-green-700' : log.action === 'DELETED' ? 'text-red-700' : 'text-amber-700'}>
                          {log.action === 'CREATED' ? 'Создание' : log.action === 'UPDATED' ? 'Изменение' : 'Удаление'}
                        </span>
                      </td>
                      <td className="table-cell text-gray-700">{(() => { try { const p = log.payload ? JSON.parse(log.payload) : {}; return p.recordSummary ?? log.entityId?.slice(0, 8) ?? '—'; } catch { return log.entityId?.slice(0, 8) ?? '—'; } })()}</td>
                      <td className="table-cell text-gray-600">{log.user?.email ?? log.user?.fullName ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardBlock>

      <Transition show={showEntryDetailModal} as={Fragment}>
        <Dialog onClose={() => setShowEntryDetailModal(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="dialog-overlay" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dialog-panel max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="dialog-title">Детали приходной накладной</Dialog.Title>
                {detailLoading ? (
                  <p className="py-6 text-center text-sm text-gray-500">Загрузка…</p>
                ) : detailEntry ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Поставщик:</span> {detailEntry.supplier?.name ?? '—'}</div>
                      <div><span className="text-gray-500">Дата:</span> {new Date(detailEntry.entryDate).toLocaleDateString('ru-RU')}</div>
                      <div className="col-span-2"><span className="text-gray-500">Позиций:</span> {detailEntry.items?.length ?? 0}</div>
                    </div>
                    {detailEntry.items?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Позиции</p>
                        <ul className="text-xs space-y-0.5">
                          {detailEntry.items.map((item: any) => (
                            <li key={item.id}>{item.material?.name ?? item.materialId}: {Number(item.quantity)} × {formatMoney(Number(item.unitPrice))}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <label className="label text-xs">Примечание</label>
                      <input className="input w-full py-1.5 text-sm" value={entryDetailEdit.note} onChange={(e) => setEntryDetailEdit((d) => ({ ...d, note: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-xs">Дата прихода</label>
                      <input type="date" className="input w-full py-1.5 text-sm" value={entryDetailEdit.entryDate} onChange={(e) => setEntryDetailEdit((d) => ({ ...d, entryDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-xs">Доставка (грн)</label>
                      <input type="text" inputMode="decimal" className="input w-full py-1.5 text-sm" value={entryDetailEdit.deliveryCost} onChange={(e) => setEntryDetailEdit((d) => ({ ...d, deliveryCost: e.target.value }))} placeholder="0" />
                    </div>
                    {entryDetailError && <p className="text-sm text-red-600" role="alert">{entryDetailError}</p>}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button type="button" onClick={saveEntryDetailEdit} className="btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1"><PencilSquareIcon className="h-4 w-4" /> Сохранить</button>
                      <button type="button" onClick={openDeleteEntryConfirm} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">Удалить</button>
                      <button type="button" onClick={() => setShowEntryDetailModal(false)} className="btn-secondary text-sm py-1.5 px-3">Закрыть</button>
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-sm text-gray-500">{entryDetailError || 'Не удалось загрузить данные'}</p>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <Transition show={showDeleteEntryConfirm} as={Fragment}>
        <Dialog onClose={() => setShowDeleteEntryConfirm(false)} className="relative z-[60]">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="dialog-overlay" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dialog-panel">
                <Dialog.Title className="dialog-title">Удалить приходную накладную?</Dialog.Title>
                <p className="mt-2 text-sm text-gray-600">Остатки на складе не изменятся.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowDeleteEntryConfirm(false)} className="btn-secondary text-sm py-1.5 px-3">Отмена</button>
                  <button type="button" onClick={() => deleteEntryDetail()} className="inline-flex items-center gap-1 rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Удалить</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

function WriteOffsPanel({
  writeOffPreset = null,
  onConsumePreset = () => {},
}: {
  writeOffPreset?: { materialId: string; materialName: string; category: string; materialLotId?: string } | null;
  onConsumePreset?: () => void;
} = {}) {
  const [list, setList] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', materialId: '', materialLotId: '', quantity: 1, reason: '', writeOffDate: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailWriteOff, setDetailWriteOff] = useState<any | null>(null);
  const [detailWOLoading, setDetailWOLoading] = useState(false);
  const [showWODetailModal, setShowWODetailModal] = useState(false);
  const [woDetailError, setWoDetailError] = useState('');
  const [woDetailEdit, setWoDetailEdit] = useState({ reason: '', writeOffDate: '' });
  const [woHistoryLogs, setWoHistoryLogs] = useState<any[]>([]);
  const [woHistoryLoading, setWoHistoryLoading] = useState(false);
  const [showDeleteWriteOffConfirm, setShowDeleteWriteOffConfirm] = useState(false);
  const [lots, setLots] = useState<any[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);

  const writeOffCategories = [...new Set((types || []).map((t: any) => (t?.name ?? '').toString().split(' ')[0]).filter(Boolean))].sort();
  const getMaterialsInCategoryWriteOff = (category: string) => {
    const typeIds = (types || []).filter((t: any) => (t?.name ?? '') === category || (t?.name ?? '').startsWith(category + ' ')).map((t: any) => t.id);
    return materials.filter((m: any) => typeIds.includes(m.materialTypeId ?? m.materialType?.id ?? ''));
  };

  const load = () => {
    setLoading(true);
    Promise.all([stockApi.getWriteOffs(), materialTypesApi.list(), materialsApi.list()]).then(([w, t, m]) => {
      setList(w);
      setTypes(t || []);
      setMaterials(m || []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  useEffect(() => {
    if (!writeOffPreset?.materialId || loading || materials.length === 0 || types.length === 0) return;
    const mat = materials.find((x: any) => x.id === writeOffPreset.materialId);
    const categoryFromMaterial = mat ? ((mat.materialType?.name ?? '').toString().split(' ')[0] || '').trim() : '';
    const category =
      (categoryFromMaterial && writeOffCategories.includes(categoryFromMaterial))
        ? categoryFromMaterial
        : writeOffCategories.includes(writeOffPreset.category)
          ? writeOffPreset.category
          : (writeOffCategories[0] ?? '');
    setForm((f) => ({
      ...f,
      category,
      materialId: writeOffPreset.materialId,
      materialLotId: writeOffPreset.materialLotId ?? '',
    }));
    setShowForm(true);
    onConsumePreset?.();
  }, [writeOffPreset?.materialId, writeOffPreset?.category, writeOffPreset?.materialLotId, loading, materials.length, types.length]);

  useEffect(() => {
    if (!form.materialId) {
      setLots([]);
      return;
    }
    setLotsLoading(true);
    stockApi.getLotsByMaterial(form.materialId).then(setLots).catch(() => setLots([])).finally(() => setLotsLoading(false));
  }, [form.materialId]);

  const loadWoHistory = () => {
    setWoHistoryLoading(true);
    reportsApi.operationLog({ entityType: 'WRITE_OFF', limit: 80 }).then(setWoHistoryLogs).finally(() => setWoHistoryLoading(false));
  };
  useEffect(() => { loadWoHistory(); }, []);

  const openWoDetail = (w: any) => {
    setDetailWriteOff(null);
    setWoDetailError('');
    setWoDetailEdit({
      reason: w.reason ?? '',
      writeOffDate: w.writeOffDate ? new Date(w.writeOffDate).toISOString().slice(0, 10) : '',
    });
    setShowWODetailModal(true);
    setDetailWOLoading(true);
    stockApi.getWriteOff(w.id).then((data) => {
      setDetailWriteOff(data);
      setWoDetailEdit({
        reason: data.reason ?? '',
        writeOffDate: data.writeOffDate ? new Date(data.writeOffDate).toISOString().slice(0, 10) : '',
      });
    }).catch((err) => setWoDetailError(err.response?.data?.message ?? 'Ошибка загрузки')).finally(() => setDetailWOLoading(false));
  };

  const saveWoDetailEdit = async () => {
    if (!detailWriteOff) return;
    setWoDetailError('');
    try {
      await stockApi.updateWriteOff(detailWriteOff.id, {
        reason: woDetailEdit.reason,
        writeOffDate: woDetailEdit.writeOffDate,
      });
      setDetailWriteOff((prev: any) => prev && { ...prev, reason: woDetailEdit.reason, writeOffDate: woDetailEdit.writeOffDate });
      load();
      loadWoHistory();
    } catch (err: any) {
      setWoDetailError(err.response?.data?.message ?? 'Ошибка');
    }
  };

  const openDeleteWriteOffConfirm = () => {
    if (detailWriteOff) setShowDeleteWriteOffConfirm(true);
  };
  const deleteWoDetail = async () => {
    if (!detailWriteOff) return;
    setWoDetailError('');
    try {
      await stockApi.deleteWriteOff(detailWriteOff.id);
      setShowDeleteWriteOffConfirm(false);
      setShowWODetailModal(false);
      setDetailWriteOff(null);
      load();
      loadWoHistory();
    } catch (err: any) {
      setWoDetailError(err.response?.data?.message ?? 'Ошибка');
    }
  };

  const openCreate = () => {
    setForm({
      category: writeOffCategories[0] ?? '',
      materialId: '',
      materialLotId: '',
      quantity: 1,
      reason: '',
      writeOffDate: new Date().toISOString().slice(0, 10),
    });
    setError('');
    setShowForm(true);
  };

  const formatLotOption = (lot: any) => {
    const exp = lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString('ru-RU') : '—';
    return `${lot.supplierName}, остаток ${Number(lot.quantity).toLocaleString('ru-RU')}, срок ${exp}`;
  };
  const lotOptions = [
    { id: '', name: 'Не указывать (по FIFO / средней)' },
    ...lots.map((l: any) => ({ id: l.id, name: formatLotOption(l) })),
  ];

  const save = async () => {
    if (!form.materialId) {
      setError('Выберите категорию и маркировку (бренд) материала');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await stockApi.createWriteOff({
        materialId: form.materialId,
        ...(form.materialLotId ? { materialLotId: form.materialLotId } : {}),
        quantity: form.quantity,
        reason: form.reason,
        writeOffDate: form.writeOffDate,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const writeOffCategoryOptions = writeOffCategories.map((g) => ({ id: g, name: g }));
  const materialOptionsWriteOff = getMaterialsInCategoryWriteOff(form.category).map((m: any) => ({ id: m.id, name: m.name }));

  if (showForm) {
    return (
      <div className="space-y-3">
        <CardBlock title="Ручное списание" icon={<ArrowUpTrayIcon className="h-4 w-4" />}>
          <p className="text-xs text-gray-500 mb-3">Категория → маркировка (бренд) материала для списания.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Материал и объём</p>
              <div className="space-y-2">
                <ListboxSelect
                  label="Категория"
                  value={form.category}
                  options={writeOffCategoryOptions}
                  onChange={(id) => setForm((f) => ({ ...f, category: id, materialId: '' }))}
                  placeholder="Напр. Адгезив"
                />
                <ListboxSelect
                  label="Маркировка (Бренд)"
                  value={form.materialId}
                  options={materialOptionsWriteOff}
                  onChange={(id) => setForm((f) => ({ ...f, materialId: id, materialLotId: '' }))}
                  placeholder="Конкретный материал"
                />
                {form.materialId && (
                  <div>
                    <label className="label">Партия (поставщик)</label>
                    <ListboxSelect
                      value={form.materialLotId}
                      options={lotOptions}
                      onChange={(id) => setForm((f) => ({ ...f, materialLotId: id }))}
                      placeholder={lotsLoading ? 'Загрузка…' : 'Выберите партию или оставьте по FIFO/средней'}
                      buttonClassName="py-1.5 text-xs border border-gray-200 rounded"
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">Укажите партию, чтобы списать именно с неё; иначе списание по настройкам склада.</p>
                  </div>
                )}
                <div>
                  <label className="label">Количество</label>
                  <span className="flex items-center gap-2">
                    <input type="number" inputMode="decimal" min={0.001} step={0.01} className="input py-2 text-sm flex-1 max-w-[120px]" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} />
                    <span className="text-sm text-gray-500">{materials.find((m: any) => m.id === form.materialId)?.unit ?? 'шт'}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Причина и дата</p>
              <div className="space-y-2">
                <div>
                  <label className="label">Причина</label>
                  <input className="input py-2 text-sm" placeholder="Брак, порча, истёк срок…" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Дата списания</label>
                  <input type="date" className="input py-2 text-sm" value={form.writeOffDate} onChange={(e) => setForm((f) => ({ ...f, writeOffDate: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-gray-700 rounded bg-gray-100 px-3 py-1.5" role="alert">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary inline-flex items-center gap-1 text-sm py-1.5 px-3">
              <ArrowLeftIcon className="h-4 w-4" /> Назад
            </button>
            <button type="button" onClick={save} className="btn-primary text-sm py-1.5 px-3" disabled={saving}>{saving ? 'Сохранение…' : 'Списать'}</button>
          </div>
        </CardBlock>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={openCreate} className="btn-primary">
        Оформить списание
      </button>
      <CardBlock title="Ручные списания" icon={<ArrowUpTrayIcon className="h-4 w-4" />}>
        {loading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-head">Дата</th>
                  <th className="table-head">Материал</th>
                  <th className="table-head text-right">Кол-во</th>
                  <th className="table-head">Причина</th>
                </tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openWoDetail(w)}>
                    <td className="table-cell">{new Date(w.writeOffDate).toLocaleDateString('ru-RU')}</td>
                    <td className="table-cell font-medium">{w.material?.name ?? '—'}</td>
                    <td className="table-cell text-right">{Number(w.quantity)}</td>
                    <td className="table-cell-muted">{w.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBlock>

      <CardBlock title="История (списания)" icon={<ClockIcon className="h-4 w-4" />}>
        {woHistoryLoading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="table-head">Дата и время</th>
                  <th className="table-head">Действие</th>
                  <th className="table-head">Запись</th>
                  <th className="table-head">Пользователь</th>
                </tr>
              </thead>
              <tbody>
                {woHistoryLogs.length === 0 ? (
                  <tr><td colSpan={4} className="table-cell text-center text-gray-500 py-4">Нет записей</td></tr>
                ) : (
                  woHistoryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="table-cell">{new Date(log.createdAt).toLocaleString('ru-RU')}</td>
                      <td className="table-cell">
                        <span className={log.action === 'CREATED' ? 'text-green-700' : log.action === 'DELETED' ? 'text-red-700' : 'text-amber-700'}>
                          {log.action === 'CREATED' ? 'Создание' : log.action === 'UPDATED' ? 'Изменение' : 'Удаление'}
                        </span>
                      </td>
                      <td className="table-cell font-mono text-[11px]">{log.entityId?.slice(0, 8) ?? '—'}</td>
                      <td className="table-cell text-gray-600">{log.user?.fullName ?? log.user?.email ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardBlock>

      <Transition show={showWODetailModal} as={Fragment}>
        <Dialog onClose={() => setShowWODetailModal(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="dialog-overlay" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dialog-panel max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="dialog-title">Детали списания</Dialog.Title>
                {detailWOLoading ? (
                  <p className="py-6 text-center text-sm text-gray-500">Загрузка…</p>
                ) : detailWriteOff ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Материал:</span> {detailWriteOff.material?.name ?? '—'}</div>
                      <div><span className="text-gray-500">Количество:</span> {Number(detailWriteOff.quantity)} {detailWriteOff.material?.unit ?? 'шт'}</div>
                    </div>
                    <div>
                      <label className="label text-xs">Причина</label>
                      <input className="input w-full py-1.5 text-sm" value={woDetailEdit.reason} onChange={(e) => setWoDetailEdit((d) => ({ ...d, reason: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-xs">Дата списания</label>
                      <input type="date" className="input w-full py-1.5 text-sm" value={woDetailEdit.writeOffDate} onChange={(e) => setWoDetailEdit((d) => ({ ...d, writeOffDate: e.target.value }))} />
                    </div>
                    {woDetailError && <p className="text-sm text-red-600" role="alert">{woDetailError}</p>}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button type="button" onClick={saveWoDetailEdit} className="btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1"><PencilSquareIcon className="h-4 w-4" /> Сохранить</button>
                      <button type="button" onClick={openDeleteWriteOffConfirm} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">Удалить</button>
                      <button type="button" onClick={() => setShowWODetailModal(false)} className="btn-secondary text-sm py-1.5 px-3">Закрыть</button>
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-sm text-gray-500">{woDetailError || 'Не удалось загрузить данные'}</p>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <Transition show={showDeleteWriteOffConfirm} as={Fragment}>
        <Dialog onClose={() => setShowDeleteWriteOffConfirm(false)} className="relative z-[60]">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="dialog-overlay" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dialog-panel">
                <Dialog.Title className="dialog-title">Удалить списание?</Dialog.Title>
                <p className="mt-2 text-sm text-gray-600">Материал будет возвращён на склад.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowDeleteWriteOffConfirm(false)} className="btn-secondary text-sm py-1.5 px-3">Отмена</button>
                  <button type="button" onClick={() => deleteWoDetail()} className="inline-flex items-center gap-1 rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Удалить</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

type MaterialLine = { category: string; materialId: string; quantity: number; amount: number };

type ServiceLine = {
  serviceId: string;
  quantity: number;
  saleDate: string;
  totalPrice: number;
  laborAmount: number;
  materialLines: MaterialLine[];
  note: string;
  saved?: boolean; // фиксирована после нажатия Сохранить; остатки для следующих строк считаются с учётом виртуального списания
};

function ServiceSalesPanel() {
  const [sales, setSales] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const defaultDate = new Date().toISOString().slice(0, 10);
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedSaleDetail, setExpandedSaleDetail] = useState<any | null>(null);
  const [expandedDetailLoading, setExpandedDetailLoading] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [detailSale, setDetailSale] = useState<any | null>(null);
  const [detailError, setDetailError] = useState('');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [unallocatedConfirmAmount, setUnallocatedConfirmAmount] = useState<number | null>(null);
  const [showDeleteSaleConfirm, setShowDeleteSaleConfirm] = useState(false);

  const safeSelected = lines.length === 0 ? -1 : Math.min(selectedIndex, lines.length - 1);
  const form = safeSelected >= 0 ? lines[safeSelected] : null;

  const updateLine = (idx: number, updater: (prev: ServiceLine) => ServiceLine) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? updater(l) : l)));
  };

  // Виртуальные остатки: реальные минус потребление всех сохранённых строк (кроме текущей редактируемой)
  const getVirtualBalances = (forSelectedIndex: number): Record<string, number> => {
    const v: Record<string, number> = { ...balances };
    lines.forEach((line, i) => {
      if (i === forSelectedIndex || !line.saved) return;
      const qty = Math.max(1, Math.floor(line.quantity));
      line.materialLines.forEach((ml) => {
        if (ml.materialId && ml.quantity > 0) {
          const key = ml.materialId;
          v[key] = (v[key] ?? 0) - ml.quantity * qty;
        }
      });
    });
    return v;
  };
  const virtualBalances = safeSelected >= 0 ? getVirtualBalances(safeSelected) : balances;

  const materialAmountsSum = form ? form.materialLines.reduce((s, l) => s + l.amount, 0) : 0;
  const assignedSum = form ? form.laborAmount + materialAmountsSum : 0;
  const remainingAfterLabor = form ? form.totalPrice - form.laborAmount : 0;
  const totalRemaining = form ? form.totalPrice - assignedSum : 0;
  const sumExact = form ? Math.abs(assignedSum - form.totalPrice) < 0.01 : true;
  const sumOver = form ? assignedSum > form.totalPrice + 0.01 : false;
  const sumUnder = form ? form.totalPrice > assignedSum + 0.01 : false;
  const remainingByLine: number[] = [];
  if (form) {
    let prev = form.totalPrice - form.laborAmount;
    for (const l of form.materialLines) {
      prev -= l.amount;
      remainingByLine.push(prev);
    }
  }
  const serviceQty = form ? Math.max(1, Math.floor(form.quantity)) : 1;
  const stockShortages: { materialId: string; name: string; need: number; have: number }[] = [];
  if (form) {
    form.materialLines.forEach((line) => {
      if (line.quantity <= 0) return;
      const need = line.quantity * serviceQty;
      const have = virtualBalances[line.materialId] ?? 0;
      if (have < need) {
        const name = allMaterials.find((m) => m.id === line.materialId)?.name ?? line.materialId;
        stockShortages.push({ materialId: line.materialId, name, need, have });
      }
    });
  }
  const stockOk = stockShortages.length === 0;
  const totalRevenue = lines.reduce((s, l) => s + l.totalPrice * Math.max(1, Math.floor(l.quantity)), 0);
  const anyLineSumOver = lines.some((l) => {
    const matSum = l.materialLines.reduce((a: number, x: MaterialLine) => a + x.amount, 0);
    return l.laborAmount + matSum > l.totalPrice + 0.01;
  });
  // Проверка остатков с учётом порядка строк (виртуальное списание по очереди)
  const anyLineStockShortage = (() => {
    const sim: Record<string, number> = { ...balances };
    for (const line of lines) {
      const q = Math.max(1, Math.floor(line.quantity));
      for (const ml of line.materialLines) {
        if (!ml.materialId || ml.quantity <= 0) continue;
        const need = ml.quantity * q;
        const have = sim[ml.materialId] ?? 0;
        if (have < need) return true;
        sim[ml.materialId] = have - need;
      }
    }
    return false;
  })();
  const allLinesSaved = lines.length > 0 && lines.every((l) => l.saved);

  const load = () => {
    setLoading(true);
    Promise.all([
      salesApi.getServiceSales(),
      servicesApi.list(),
      materialTypesApi.list(),
      materialsApi.list(),
      reportsApi.inventoryBalance(),
    ])
      .then(([saleList, svcList, typeList, mats, inv]) => {
        setSales(Array.isArray(saleList) ? saleList : []);
        setServices(Array.isArray(svcList) ? svcList : []);
        setMaterialTypes(Array.isArray(typeList) ? typeList : []);
        setAllMaterials(Array.isArray(mats) ? mats : []);
        const byId: Record<string, number> = {};
        (Array.isArray(mats) ? mats : []).forEach((m: any) => { byId[m.id] = Number(m.currentQuantity ?? 0); });
        const invList = Array.isArray(inv) ? inv : [];
        invList.forEach((i: any) => { byId[i.id] = Number(i.quantity ?? 0); });
        setBalances(byId);
      })
      .catch(() => {
        setSales([]);
        setServices([]);
        setMaterialTypes([]);
        setAllMaterials([]);
        setBalances({});
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  const loadHistory = () => {
    setHistoryLoading(true);
    reportsApi.operationLog({ entityType: 'SERVICE_SALE', limit: 80 }).then(setHistoryLogs).finally(() => setHistoryLoading(false));
  };
  useEffect(() => { loadHistory(); }, []);

  const toggleExpand = (s: any) => {
    if (expandedSaleId === s.id) {
      setExpandedSaleId(null);
      setExpandedSaleDetail(null);
      return;
    }
    setExpandedSaleId(s.id);
    setExpandedSaleDetail(null);
    setExpandedDetailLoading(true);
    salesApi.getServiceSale(s.id).then((data) => {
      setExpandedSaleDetail(data);
    }).catch(() => setExpandedSaleDetail(null)).finally(() => setExpandedDetailLoading(false));
  };

  const openEditForm = () => {
    if (!expandedSaleDetail) return;
    const sale = expandedSaleDetail;
    const materialLines: MaterialLine[] = (sale.materialSnapshots ?? []).map((snap: any) => ({
      category: getCategoryForMaterial(snap.materialId),
      materialId: snap.materialId,
      quantity: Number(snap.quantity),
      amount: Number(snap.assignedSaleAmount ?? 0),
    }));
    const line: ServiceLine = {
      serviceId: sale.serviceId,
      quantity: 1,
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString().slice(0, 10) : defaultDate,
      totalPrice: Number(sale.salePrice ?? 0),
      laborAmount: Number(sale.laborAmount ?? 0),
      materialLines,
      note: sale.note ?? '',
      saved: true,
    };
    setLines([line]);
    setSelectedIndex(0);
    setEditingSaleId(sale.id);
    setError('');
    setOpen(true);
  };

  const [deletingSale, setDeletingSale] = useState(false);
  const openDeleteSaleConfirm = () => {
    if (expandedSaleDetail) {
      setDetailSale(expandedSaleDetail);
      setDetailError('');
      setShowDeleteSaleConfirm(true);
    }
  };
  const deleteDetailSale = async () => {
    if (!detailSale) return;
    setDetailError('');
    setDeletingSale(true);
    try {
      await salesApi.deleteServiceSale(detailSale.id);
      setShowDeleteSaleConfirm(false);
      setDetailSale(null);
      setExpandedSaleId(null);
      setExpandedSaleDetail(null);
      await load();
      loadHistory();
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setDetailError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Не удалось удалить запись');
    } finally {
      setDeletingSale(false);
    }
  };

  const getCategoryForMaterial = (materialId: string) => {
    const m = allMaterials.find((x) => x.id === materialId);
    const typeId = m?.materialTypeId ?? m?.materialType?.id ?? '';
    const t = materialTypes.find((x) => x.id === typeId);
    return t ? (t.name ?? '').toString().split(' ')[0] ?? '' : '';
  };
  const getMaterialsInCategorySale = (category: string) => {
    const typeIds = materialTypes.filter((t) => (t?.name ?? '') === category || (t?.name ?? '').startsWith(category + ' ')).map((t) => t.id);
    return allMaterials.filter((m) => typeIds.includes(m.materialTypeId ?? m.materialType?.id ?? ''));
  };

  /** Цена закупки (WAC) по методу учёта — для подстановки в сумму списания по умолчанию */
  const getPurchaseCost = (materialId: string): number => {
    const m = allMaterials.find((x) => x.id === materialId);
    return Number(m?.averageCost ?? 0);
  };

  const openCreate = () => {
    const first = services[0];
    const mats = first?.materials ?? [];
    const materialLines: MaterialLine[] = mats.map((m: any) => ({
      category: getCategoryForMaterial(m.materialId),
      materialId: m.materialId,
      quantity: Number(m.quantity ?? 0),
      amount: getPurchaseCost(m.materialId),
    }));
    setLines([{
      serviceId: first?.id ?? '',
      quantity: 1,
      saleDate: defaultDate,
      totalPrice: Number(first?.basePrice ?? 0),
      laborAmount: 0,
      materialLines,
      note: '',
      saved: false,
    }]);
    setSelectedIndex(0);
    setError('');
    setOpen(true);
  };

  const addLine = () => {
    const first = services[0];
    const mats = first?.materials ?? [];
    const materialLines: MaterialLine[] = mats.map((m: any) => ({
      category: getCategoryForMaterial(m.materialId),
      materialId: m.materialId,
      quantity: Number(m.quantity ?? 0),
      amount: getPurchaseCost(m.materialId),
    }));
    const newLine: ServiceLine = {
      serviceId: first?.id ?? '',
      quantity: 1,
      saleDate: defaultDate,
      totalPrice: Number(first?.basePrice ?? 0),
      laborAmount: 0,
      materialLines,
      note: '',
      saved: false,
    };
    setLines((prev) => [...prev, newLine]);
    setSelectedIndex(lines.length);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIndex((prev) => {
      if (prev >= idx && prev > 0) return prev - 1;
      if (prev >= idx && prev === 0 && lines.length > 1) return 0;
      return prev;
    });
  };

  const confirmRemoveLine = () => {
    if (deleteConfirmIndex === null) return;
    removeLine(deleteConfirmIndex);
    setDeleteConfirmIndex(null);
  };

  const onServiceChange = (serviceId: string) => {
    if (safeSelected < 0) return;
    const svc = services.find((s) => s.id === serviceId);
    const mats = svc?.materials ?? [];
    const materialLines: MaterialLine[] = mats.map((m: any) => ({
      category: getCategoryForMaterial(m.materialId),
      materialId: m.materialId,
      quantity: Number(m.quantity ?? 0),
      amount: getPurchaseCost(m.materialId),
    }));
    updateLine(safeSelected, (f) => ({
      ...f,
      serviceId: serviceId,
      totalPrice: Number(svc?.basePrice ?? 0),
      laborAmount: 0,
      materialLines,
    }));
  };

  const materialCategories = [...new Set(materialTypes.map((t) => (t?.name ?? '').toString().split(' ')[0]).filter(Boolean))].sort();

  const addMaterialLine = () => {
    if (safeSelected < 0) return;
    const firstCat = materialCategories[0] ?? '';
    updateLine(safeSelected, (f) => ({
      ...f,
      materialLines: [...f.materialLines, { category: firstCat, materialId: '', quantity: 0, amount: 0 }],
    }));
  };

  const updateMaterialLine = (idx: number, field: keyof MaterialLine, value: number | string) => {
    if (safeSelected < 0) return;
    updateLine(safeSelected, (f) => ({
      ...f,
      materialLines: f.materialLines.map((l, i) => {
        if (i !== idx) return l;
        if (field === 'category') return { ...l, category: value as string, materialId: '' };
        if (field === 'materialId') {
          const newId = value as string;
          return { ...l, materialId: newId, amount: getPurchaseCost(newId) };
        }
        return { ...l, [field]: Number(value) };
      }),
    }));
  };

  const removeMaterialLine = (idx: number) => {
    if (safeSelected < 0) return;
    updateLine(safeSelected, (f) => ({
      ...f,
      materialLines: f.materialLines.filter((_, i) => i !== idx),
    }));
  };

  const setLaborAmount = (v: number) => {
    if (safeSelected < 0) return;
    updateLine(safeSelected, (f) => ({ ...f, laborAmount: Math.max(0, v) }));
  };

  const saveLineFields = (patch: Partial<ServiceLine>) => {
    if (safeSelected < 0) return;
    if ('quantity' in patch && patch.quantity === 0) {
      removeLine(safeSelected);
      return;
    }
    updateLine(safeSelected, (f) => ({ ...f, ...patch }));
  };

  const saveLineAsSaved = () => {
    if (safeSelected < 0 || !form) return;
    if (sumOver) {
      setError('Сумма распределения не может превышать общую сумму');
      return;
    }
    if (!stockOk) {
      setError('Недостаточно материалов на складе (с учётом уже сохранённых строк). Уменьшите кол-во или материалы.');
      return;
    }
    const materialAmounts = form.materialLines.filter((l) => l.materialId && (l.quantity > 0 || l.amount > 0));
    if (materialAmounts.length === 0) {
      setError('Добавьте хотя бы один материал с количеством или суммой');
      return;
    }
    setError('');
    updateLine(safeSelected, (l) => ({ ...l, saved: true }));
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  const doSave = async () => {
    setSaving(true);
    setError('');
    try {
      for (const line of lines) {
        const materialAmounts = line.materialLines
          .filter((l) => l.materialId && (l.quantity > 0 || l.amount > 0))
          .map((l) => ({ materialId: l.materialId, quantity: l.quantity, amount: l.amount }));
        if (materialAmounts.length === 0) {
          setError(`Строка «${services.find((s) => s.id === line.serviceId)?.name ?? line.serviceId}»: добавьте хотя бы один материал с количеством или суммой`);
          setSaving(false);
          return;
        }
        const payload = {
          serviceId: line.serviceId,
          saleDate: line.saleDate,
          totalPrice: line.totalPrice,
          laborAmount: line.laborAmount,
          materialAmounts,
          note: line.note || undefined,
        };
        const qty = Math.max(1, Math.floor(line.quantity));
        for (let i = 0; i < qty; i++) {
          await salesApi.createServiceSale(payload);
        }
      }
      setUnallocatedConfirmAmount(null);
      setOpen(false);
      setEditingSaleId(null);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (lines.length === 0) {
      setError('Добавьте хотя бы одну строку услуги');
      return;
    }
    if (editingSaleId && form) {
      const totalPrice = Number(form.totalPrice);
      const laborAmount = Number(form.laborAmount);
      if (Number.isNaN(totalPrice) || totalPrice < 0 || Number.isNaN(laborAmount) || laborAmount < 0) {
        setError('Сумма и доля труда должны быть неотрицательными числами.');
        return;
      }
      const payload = {
        totalPrice,
        laborAmount,
        ...(form.note != null && form.note.trim() !== '' && { note: form.note.trim() }),
        ...(form.saleDate && { saleDate: form.saleDate }),
      };
      setSaving(true);
      setError('');
      try {
        await salesApi.updateServiceSale(editingSaleId, payload);
        setOpen(false);
        setEditingSaleId(null);
        setLines([]);
        await load();
        loadHistory();
        setExpandedSaleId(null);
        setExpandedSaleDetail(null);
      } catch (e: any) {
        const msg = e.response?.data?.message;
        const errText = Array.isArray(msg) ? msg.join(', ') : msg ?? e.message ?? 'Ошибка сохранения';
        setError(errText);
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!allLinesSaved) {
      setError('Сохраните все строки (кнопка «Сохранить» под таблицей для каждой строки), затем нажмите «Зарегистрировать».');
      return;
    }
    if (anyLineSumOver) {
      setError('У одной или нескольких строк сумма распределения превышает общую сумму. Исправьте выбранную строку.');
      return;
    }
    if (anyLineStockShortage) {
      setError('Недостаточно материалов на складе для одной или нескольких строк. Уменьшите кол-во услуг или количество материалов.');
      return;
    }
    const totalUnallocated = lines.reduce((sum, l) => {
      const matSum = l.materialLines.reduce((a: number, x: MaterialLine) => a + x.amount, 0);
      const remainder = l.totalPrice - l.laborAmount - matSum;
      if (remainder <= 0.01) return sum;
      const qty = Math.max(1, Math.floor(l.quantity));
      return sum + remainder * qty;
    }, 0);
    const hasSumUnder = totalUnallocated > 0.01;
    if (hasSumUnder) {
      setUnallocatedConfirmAmount(totalUnallocated);
      return;
    }
    await doSave();
  };

  const serviceOptions = services.map((s) => ({ id: s.id, name: s.name }));
  const categoryOptions = materialCategories.map((g) => ({ id: g, name: g }));

  if (open) {
    return (
      <div className="space-y-2">
        <CardBlock title={editingSaleId ? 'Редактировать продажу услуги' : 'Продажа услуги'} icon={<ShoppingCartIcon className="h-4 w-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
              <p className="text-[11px] font-medium text-gray-500 mb-1.5">Строки услуг</p>
              <ul className="space-y-1 max-h-[280px] overflow-y-auto">
                {lines.map((line, idx) => {
                  const svcName = services.find((s) => s.id === line.serviceId)?.name ?? '—';
                  const isSelected = idx === safeSelected;
                  const isUnsaved = !line.saved;
                  const lineSum = line.totalPrice * Math.max(1, Math.floor(line.quantity));
                  return (
                    <li key={idx}>
                      <div
                        className={`rounded-lg border px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${isSelected && isUnsaved ? 'border-sky-200 bg-sky-50' : isSelected ? 'border-gray-300 bg-white shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/80'}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedIndex(idx)}
                          className="flex-1 min-w-0 text-left flex items-center gap-1"
                        >
                          {line.saved && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden />}
                          <span className="truncate font-medium text-gray-900">{svcName}</span>
                          <span className="shrink-0 text-gray-500">{Math.floor(line.quantity)} × {formatMoney(line.totalPrice)}</span>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirmIndex(idx); }} className="shrink-0 p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" aria-label="Удалить строку" title="Удалить"><TrashIcon className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5 pl-1">
                        <span className="text-[10px] text-gray-400">{formatMoney(lineSum)}</span>
                        {isUnsaved && <span className="text-[10px] text-sky-600">не сохранена</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-1.5">
                <button type="button" onClick={addLine} className="text-xs font-medium rounded-md px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1">+ Добавить услугу</button>
              </div>
              {lines.length === 0 && (
                <p className="text-xs text-gray-500 py-2 mt-0.5">Добавьте строку услуги кнопкой выше.</p>
              )}
              {form && (
                <div key={`line-${safeSelected}`} className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  <p className="text-[11px] font-medium text-gray-500">Выбранная строка</p>
                  <ListboxSelect
                    key={`service-${safeSelected}-${form.serviceId}`}
                    value={form.serviceId}
                    options={serviceOptions}
                    onChange={(id) => onServiceChange(id)}
                    placeholder="Услуга"
                    buttonClassName="py-1.5 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="label text-xs">Кол-во (0 — удалить строку)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        className="input w-full py-1.5 text-sm"
                        value={form.quantity ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') return;
                          const num = parseInt(v, 10);
                          if (Number.isNaN(num)) return;
                          if (num <= 0) saveLineFields({ quantity: 0 });
                          else saveLineFields({ quantity: num });
                        }}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Дата</label>
                      <input type="date" className="input py-1.5 text-sm" value={form.saleDate} onChange={(e) => saveLineFields({ saleDate: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Примечание</label>
                    <input className="input py-1.5 text-sm" placeholder="—" value={form.note} onChange={(e) => saveLineFields({ note: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-4 rounded-lg border border-gray-100 bg-white p-2.5">
              {form ? (
                <div key={`right-panel-${safeSelected}`}>
                  <p className="text-[11px] font-medium text-gray-500 mb-0.5">Распределение сумм (грн) за одну услугу</p>
                  <p className="text-[11px] text-gray-500 mb-1.5">Категория → маркировка (бренд). Закупка — цена по методу учёта (WAC). Сумма за ед. по умолчанию подставляется из закупки, можно изменить.</p>
              <div className="rounded-lg border border-gray-100 overflow-visible">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Категория</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Маркировка (Бренд)</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-700 w-16">Кол-во</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-700 w-20" title="Цена закупки (WAC) по методу учёта">Закупка (грн)</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-700 w-20">Сумма за ед.</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-700 w-14">Остаток</th>
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <td colSpan={2} className="py-1.5 px-2 font-semibold text-gray-900">Общая сумма</td>
                      <td className="py-1.5 px-2 text-right text-gray-500">—</td>
                      <td className="py-1.5 px-2 text-right text-gray-400">—</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          className="input py-1 text-right w-full max-w-[90px] ml-auto inline-block text-sm font-medium border-gray-200 focus:border-gray-400 focus:ring-gray-300"
                          value={form.totalPrice || ''}
                          onChange={(e) => saveLineFields({ totalPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right text-gray-400">—</td>
                      <td />
                    </tr>
                    <tr className="bg-gray-50/60">
                      <td colSpan={2} className="py-1.5 px-2 text-gray-700 font-medium">Услуга стоматолога</td>
                      <td className="py-1.5 px-2 text-right text-gray-500">—</td>
                      <td className="py-1.5 px-2 text-right text-gray-400">—</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          className="input py-1 text-right w-full max-w-[90px] ml-auto inline-block text-sm border-gray-100"
                          value={form.laborAmount || ''}
                          onChange={(e) => setLaborAmount(parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right text-gray-500 text-[11px]">{formatMoney(remainingAfterLabor)}</td>
                      <td />
                    </tr>
                    {form.materialLines.map((line, idx) => {
                      const balance = virtualBalances[line.materialId] ?? 0;
                      const needTotal = line.quantity * serviceQty;
                      const short = line.quantity > 0 && balance < needTotal;
                      return (
                        <tr key={idx} className={short ? 'bg-gray-100/80' : 'bg-white hover:bg-gray-50/50'}>
                          <td className="py-1.5 px-2">
                            <ListboxSelect
                              value={line.category}
                              options={categoryOptions}
                              onChange={(id) => updateMaterialLine(idx, 'category', id)}
                              placeholder="Категория"
                              className="min-w-0"
                              buttonClassName="py-1 text-xs border border-gray-100 rounded hover:border-gray-200"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <ListboxSelect
                              value={line.materialId}
                              options={getMaterialsInCategorySale(line.category).map((m) => ({ id: m.id, name: m.name }))}
                              onChange={(id) => updateMaterialLine(idx, 'materialId', id)}
                              placeholder="Маркировка (Бренд)"
                              className="min-w-0"
                              buttonClassName="py-1 text-xs border border-gray-100 rounded hover:border-gray-200"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <span className="inline-flex items-center justify-end gap-1">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={0.01}
                                className="input py-1 text-right w-14 inline-block text-sm border-gray-100"
                                value={line.quantity || ''}
                                onChange={(e) => updateMaterialLine(idx, 'quantity', e.target.value)}
                              />
                              <span className="text-[11px] text-gray-500 w-10 text-left shrink-0">{allMaterials.find((m) => m.id === line.materialId)?.unit ?? 'шт'}</span>
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-gray-600 text-[11px]" title="Цена закупки (средневзвешенная)">
                            {line.materialId ? formatMoney(getPurchaseCost(line.materialId)) : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={0.01}
                              className="input py-1 text-right w-full max-w-[90px] ml-auto inline-block text-sm border-gray-100"
                              value={line.amount || ''}
                              onChange={(e) => updateMaterialLine(idx, 'amount', e.target.value)}
                              placeholder={line.materialId ? String(getPurchaseCost(line.materialId)) : ''}
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right text-gray-600 text-[11px]" title="Остаток на складе">
                            <span>{balance.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</span>
                            <span className="text-gray-400 ml-0.5">{allMaterials.find((m) => m.id === line.materialId)?.unit ?? 'шт'}</span>
                            {line.quantity > 0 && serviceQty > 0 && (
                              <span className="block text-[10px] text-gray-500">нужно {needTotal.toLocaleString('ru-RU')}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-1">
                            <button type="button" onClick={() => removeMaterialLine(idx)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-colors" aria-label="Удалить">×</button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50/80 border-t border-gray-100 font-semibold">
                      <td colSpan={2} className="py-1.5 px-2 text-gray-900">Итого назначено</td>
                      <td className="py-1.5 px-2 text-right text-gray-500">—</td>
                      <td className="py-1.5 px-2 text-right text-gray-500">—</td>
                      <td className="py-1.5 px-2 text-right text-gray-900">{formatMoney(assignedSum)}</td>
                      <td className={`py-1.5 px-2 text-right ${sumExact ? 'text-green-700' : sumUnder ? 'text-amber-700' : 'text-red-700'}`}>
                        {sumExact ? '✓ Совпадает' : sumUnder ? `− ${formatMoney(totalRemaining)}` : `+ ${formatMoney(-totalRemaining)}`}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-1.5">
                <button type="button" onClick={addMaterialLine} className="text-xs font-medium rounded-md px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1">+ Материал</button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {!editingSaleId && (
                  <>
                    <button
                      type="button"
                      onClick={saveLineAsSaved}
                      disabled={sumOver || !stockOk}
                      className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                    >
                      {savedFeedback ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                      {savedFeedback ? 'Сохранено' : 'Сохранить'}
                    </button>
                    <span className="text-[11px] text-gray-500">После сохранения строка фиксируется, остатки для следующих услуг пересчитаются.</span>
                  </>
                )}
                {editingSaleId && (
                  <span className="text-[11px] text-gray-500">Измените данные и нажмите «Сохранить изменения» внизу.</span>
                )}
              </div>
              {sumUnder && (
                <div role="alert" className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600">
                  Нераспределённо: <strong>{formatMoney(totalRemaining)}</strong>. При нажатии «Зарегистрировать» откроется подтверждение.
                </div>
              )}
              {stockShortages.length > 0 && (
                <div role="alert" className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600">
                  <p className="font-medium mb-1">На складе недостаточно материалов для регистрации этой услуги.</p>
                  <ul className="list-none space-y-0.5">
                    {stockShortages.map((s) => (
                      <li key={s.materialId} className="flex items-baseline gap-1.5">
                        <span className="text-amber-600 shrink-0">•</span>
                        <span><strong>{s.name}</strong> — нужно {s.need.toLocaleString('ru-RU')}, в наличии {s.have.toLocaleString('ru-RU')}.</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-gray-600">Пополните склад (приход) или уменьшите количество услуг/материалов в таблице.</p>
                </div>
              )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                  <p className="text-sm font-medium">Выберите строку услуги слева</p>
                  <p className="text-xs mt-1">или добавьте новую кнопкой «+ Добавить»</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 mt-1">При регистрации со склада списывается: по каждому материалу (кол-во × кол-во услуг).</p>

          {lines.length > 0 && (
            <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">Итого к проведению</span>
                <span className="text-sm font-semibold text-gray-900">{formatMoney(totalRevenue)}</span>
              </div>
              {!allLinesSaved && <span className="text-[11px] text-amber-700">Сохраните все строки услуг перед регистрацией.</span>}
            </div>
          )}

          {error && <p className="mt-2 text-xs text-gray-700 rounded bg-gray-100 px-2 py-1" role="alert">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary inline-flex items-center gap-1 text-xs py-1.5 px-2.5">
              <ArrowLeftIcon className="h-3.5 w-3.5" /> Назад
            </button>
            <button
              type="button"
              onClick={save}
              className="btn-primary text-xs py-1.5 px-2.5"
              disabled={editingSaleId ? saving : (saving || lines.length === 0 || !allLinesSaved || anyLineSumOver || anyLineStockShortage)}
            >
              {saving ? (editingSaleId ? 'Сохранение…' : 'Проведение…') : (editingSaleId ? 'Сохранить изменения' : 'Зарегистрировать')}
            </button>
          </div>
        </CardBlock>

        <Transition show={deleteConfirmIndex !== null} as={Fragment}>
          <Dialog onClose={() => setDeleteConfirmIndex(null)} className="relative z-50">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="dialog-overlay" aria-hidden="true" />
            </Transition.Child>
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="dialog-panel">
                  <Dialog.Title className="dialog-title">
                    Удалить строку услуги?
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-gray-600">
                    {deleteConfirmIndex !== null && lines[deleteConfirmIndex] && (
                      <>Строка «{services.find((s) => s.id === lines[deleteConfirmIndex].serviceId)?.name ?? '—'}» будет удалена из списка. Это действие нельзя отменить.</>
                    )}
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setDeleteConfirmIndex(null)} className="btn-secondary text-xs py-1.5 px-2.5">Отмена</button>
                    <button type="button" onClick={confirmRemoveLine} className="inline-flex items-center gap-1 rounded-md border border-transparent bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
                      Удалить
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        <Transition show={unallocatedConfirmAmount != null} as={Fragment}>
          <Dialog onClose={() => setUnallocatedConfirmAmount(null)} className="relative z-50">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="dialog-overlay" aria-hidden="true" />
            </Transition.Child>
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="dialog-panel">
                  <Dialog.Title className="dialog-title">Нераспределённая сумма</Dialog.Title>
                  <p className="mt-2 text-sm text-gray-600">
                    Остаётся нераспределёнными <strong>{unallocatedConfirmAmount != null ? formatMoney(unallocatedConfirmAmount) : ''}</strong>. Продолжить регистрацию?
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setUnallocatedConfirmAmount(null)} className="btn-secondary text-sm py-1.5 px-3">Отмена</button>
                    <button type="button" onClick={() => doSave()} disabled={saving} className="btn-primary text-sm py-1.5 px-3">{saving ? 'Сохранение…' : 'Продолжить'}</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        <Transition show={showDeleteSaleConfirm} as={Fragment}>
          <Dialog onClose={() => setShowDeleteSaleConfirm(false)} className="relative z-[60]">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="dialog-overlay" aria-hidden="true" />
            </Transition.Child>
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="dialog-panel">
                  <Dialog.Title className="dialog-title">Удалить продажу?</Dialog.Title>
                  <p className="mt-2 text-sm text-gray-600">Материалы будут возвращены на склад.</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowDeleteSaleConfirm(false)} className="btn-secondary text-sm py-1.5 px-3">Отмена</button>
                    <button type="button" onClick={() => deleteDetailSale()} className="inline-flex items-center gap-1 rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Удалить</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={openCreate} className="btn-primary">
        Зарегистрировать продажу услуги
      </button>
      <CardBlock title="Продажи услуг" icon={<ShoppingCartIcon className="h-4 w-4" />}>
        {loading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-head w-6" aria-label="Развернуть" />
                  <th className="table-head">Дата</th>
                  <th className="table-head">Услуга</th>
                  <th className="table-head text-right">Сумма</th>
                  <th className="table-head text-right" title="Выручка − себестоимость материалов (по закупочным ценам)">Маржа</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <Fragment key={s.id}>
                    <tr
                      className={`hover:bg-gray-50/50 cursor-pointer ${expandedSaleId === s.id ? 'bg-gray-50' : ''}`}
                      onClick={() => toggleExpand(s)}
                    >
                      <td className="table-cell text-gray-400">{expandedSaleId === s.id ? '▼' : '▶'}</td>
                      <td className="table-cell">{new Date(s.saleDate).toLocaleDateString('ru-RU')}</td>
                      <td className="table-cell font-medium">{s.service?.name ?? '—'}</td>
                      <td className="table-cell text-right">{formatMoney(Number(s.salePrice))}</td>
                      <td className="table-cell text-right font-medium">{formatMoney(Number(s.grossMargin))}</td>
                    </tr>
                    {expandedSaleId === s.id && (
                      <tr className="bg-gray-50/80">
                        <td colSpan={5} className="table-cell p-3">
                          {expandedDetailLoading ? (
                            <p className="text-xs text-gray-500">Загрузка…</p>
                          ) : expandedSaleDetail ? (
                            <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
                              <div className="min-w-0 space-y-2.5">
                                <p className="font-semibold text-gray-900 leading-tight">{expandedSaleDetail.service?.name ?? '—'}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                  <span className="text-gray-500">Дата</span>
                                  <span className="text-gray-900">{new Date(expandedSaleDetail.saleDate).toLocaleDateString('ru-RU')}</span>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-gray-500">Сумма</span>
                                  <span className="font-semibold text-gray-900">{formatMoney(Number(expandedSaleDetail.salePrice))}</span>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-gray-500" title="Себестоимость материалов">Себ.</span>
                                  <span className="text-gray-700">{formatMoney(Number(expandedSaleDetail.materialCostTotal ?? 0))}</span>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-gray-500">Маржа</span>
                                  <span className="font-semibold text-gray-900">{formatMoney(Number(expandedSaleDetail.grossMargin))}</span>
                                </div>
                                {expandedSaleDetail.materialSnapshots?.length > 0 && (
                                  <ul className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gray-600 list-none">
                                    {expandedSaleDetail.materialSnapshots.map((snap: any, i: number) => (
                                      <li key={i} className="flex items-baseline gap-1">
                                        <span className="text-gray-400 shrink-0">•</span>
                                        <span>{snap.material?.name ?? snap.materialId}</span>
                                        <span className="text-gray-500">{Number(snap.quantity)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openEditForm(); }}
                                  className="inline-flex items-center gap-1 rounded-md py-1.5 px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1"
                                >
                                  <PencilSquareIcon className="h-3.5 w-3.5" /> Редактировать
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openDeleteSaleConfirm(); }}
                                  className="inline-flex items-center gap-1 rounded-md py-1.5 px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-1"
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">Не удалось загрузить данные</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBlock>

      <CardBlock title="История (продажи услуг)" icon={<ClockIcon className="h-4 w-4" />}>
        {historyLoading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="table-head">Дата и время</th>
                  <th className="table-head">Действие</th>
                  <th className="table-head">Запись</th>
                  <th className="table-head">Пользователь</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.length === 0 ? (
                  <tr><td colSpan={4} className="table-cell text-center text-gray-500 py-4">Нет записей</td></tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="table-cell">{new Date(log.createdAt).toLocaleString('ru-RU')}</td>
                      <td className="table-cell">
                        <span className={log.action === 'CREATED' ? 'text-green-700' : log.action === 'DELETED' ? 'text-red-700' : 'text-amber-700'}>
                          {log.action === 'CREATED' ? 'Создание' : log.action === 'UPDATED' ? 'Изменение' : 'Удаление'}
                        </span>
                      </td>
                      <td className="table-cell text-gray-700">{(() => { try { const p = log.payload ? JSON.parse(log.payload) : {}; return p.recordSummary ?? log.entityId?.slice(0, 8) ?? '—'; } catch { return log.entityId?.slice(0, 8) ?? '—'; } })()}</td>
                      <td className="table-cell text-gray-600">{log.user?.email ?? log.user?.fullName ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardBlock>

      {/* Диалог удаления продажи — на главном виде таблицы, чтобы кнопка «Удалить» работала */}
      <Transition show={showDeleteSaleConfirm} as={Fragment}>
        <Dialog onClose={() => { setShowDeleteSaleConfirm(false); setDetailError(''); }} className="relative z-[60]">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="dialog-overlay" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dialog-panel">
                <Dialog.Title className="dialog-title">Удалить продажу?</Dialog.Title>
                <p className="mt-2 text-sm text-gray-600">Материалы будут возвращены на склад.</p>
                {detailError && <p className="mt-2 text-sm text-red-600" role="alert">{detailError}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowDeleteSaleConfirm(false); setDetailError(''); }} disabled={deletingSale} className="btn-secondary text-sm py-1.5 px-3">Отмена</button>
                  <button type="button" onClick={() => deleteDetailSale()} disabled={deletingSale} className="inline-flex items-center gap-1 rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-70">{deletingSale ? 'Удаление…' : 'Удалить'}</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
