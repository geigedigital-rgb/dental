import { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { MagnifyingGlassIcon, CubeIcon } from '@heroicons/react/24/outline';
import { materialsApi, materialTypesApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';
import { CardBlock } from '../../shared/CardBlock';
import { ListboxSelect } from '../../shared/ListboxSelect';

export function MaterialsPage() {
  const [list, setList] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState(false);
  const [filterTypeId, setFilterTypeId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    materialGroup: '',
    name: '',
    unit: 'шт',
    purchaseUnit: '',
    purchaseUnitRatio: 1,
    country: '',
    description: '',
    minStockThreshold: 0,
    isArchived: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const load = () => {
    setLoading(true);
    Promise.all([
      materialsApi.list({
        archived: archived ? 'true' : undefined,
        materialTypeId: filterTypeId || undefined,
        search: search || undefined,
      }),
      materialTypesApi.list(),
    ])
      .then(([mats, typeList]) => {
        setList(mats);
        setTypes(typeList || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [archived, filterTypeId, search]);

  const materialGroups = [...new Set((types || []).map((t: any) => t.name.split(' ')[0]).filter(Boolean))].sort();
  const getTypesInGroupMat = (group: string) => (types || []).filter((t: any) => t.name === group || t.name.startsWith(group + ' '));
  const getGroupForTypeIdMat = (typeId: string) => {
    const t = types.find((x: any) => x.id === typeId);
    return t ? t.name.split(' ')[0] ?? '' : '';
  };
  /** Первый тип в категории (по sortOrder) — для привязки материала к типу при сохранении */
  const getFirstTypeIdInCategory = (category: string) => {
    const inGroup = getTypesInGroupMat(category).sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return inGroup[0]?.id ?? '';
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      materialGroup: materialGroups[0] ?? '',
      name: '',
      unit: 'шт',
      purchaseUnit: '',
      purchaseUnitRatio: 1,
      country: '',
      description: '',
      minStockThreshold: 0,
      isArchived: false,
    });
    setError('');
    setOpen(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    const typeId = m.materialTypeId ?? m.materialType?.id ?? '';
    setForm({
      materialGroup: getGroupForTypeIdMat(typeId),
      name: m.name,
      unit: m.unit,
      purchaseUnit: m.purchaseUnit ?? '',
      purchaseUnitRatio: Number(m.purchaseUnitRatio ?? 1),
      country: m.country ?? '',
      description: m.description ?? '',
      minStockThreshold: Number(m.minStockThreshold ?? 0),
      isArchived: m.isArchived ?? false,
    });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    const materialTypeId = getFirstTypeIdInCategory(form.materialGroup);
    if (!materialTypeId) {
      setError('Выберите категорию');
      return;
    }
    if (!form.name?.trim()) {
      setError('Укажите маркировку (бренд)');
      return;
    }
    setSaving(true);
    setError('');
    const ratio = form.purchaseUnitRatio >= 0.0001 ? form.purchaseUnitRatio : 1;
    const payload = {
      materialTypeId,
      name: form.name.trim(),
      unit: form.unit,
      purchaseUnit: form.purchaseUnit?.trim() || undefined,
      purchaseUnitRatio: ratio,
      country: form.country || undefined,
      description: form.description || undefined,
      minStockThreshold: form.minStockThreshold,
      isArchived: form.isArchived,
    };
    try {
      if (editing) {
        await materialsApi.update(editing.id, payload);
      } else {
        await materialsApi.create(payload);
      }
      setOpen(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    setDeleteError('');
    setDeleteConfirmId(id);
  };
  const confirmRemove = async () => {
    if (!deleteConfirmId) return;
    setDeleteError('');
    try {
      await materialsApi.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      load();
    } catch (e: any) {
      setDeleteError(e.response?.data?.message ?? 'Ошибка удаления');
    }
  };

  const formatNum = (v: any) =>
    v != null ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(Number(v)) : '—';

  const typeOptions = (types || []).map((t: any) => ({ id: t.id, name: t.name }));
  const groupOptionsMat = materialGroups.map((g: string) => ({ id: g, name: g }));

  return (
    <div className="space-y-3">
      <PageHeader
        title="Материалы"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Материалы' }]}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            Добавить материал
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            placeholder="Поиск по названию или типу"
            className="input pl-8 py-1.5 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Поиск материалов"
          />
        </div>
        <div className="min-w-[200px]">
          <ListboxSelect
            value={filterTypeId}
            options={[{ id: '', name: 'Все типы' }, ...typeOptions]}
            onChange={(id) => setFilterTypeId(id)}
            placeholder="Тип материала"
            buttonClassName="py-1.5 text-sm"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-200 text-primary-600 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            aria-label="Показать архивные"
          />
          Показать архивные
        </label>
      </div>

      <CardBlock title="Библиотека материалов" icon={<CubeIcon className="h-4 w-4" />}>
        <p className="text-xs text-gray-500 mb-2">
          Общий справочник: тип → маркировка (бренд), ед. изм., страна, назначение. Отсюда материалы подтягиваются в приход, списание, продажи и отчёты.
        </p>
        {loading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-head">Категория</th>
                  <th className="table-head">Маркировка (Бренд)</th>
                  <th className="table-head">Ед. учета (списания)</th>
                  <th className="table-head">Ед. закупки</th>
                  <th className="table-head text-right">В 1 закупке</th>
                  <th className="table-head">Страна</th>
                  <th className="table-head max-w-[200px]">Назначение</th>
                  <th className="table-head text-right">Остаток</th>
                  <th className="table-head text-right">Ср. себестоимость</th>
                  <th className="table-head text-right">Мин. порог</th>
                  <th className="table-head text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => {
                  const typeId = m.materialTypeId ?? m.materialType?.id ?? '';
                  const category = getGroupForTypeIdMat(typeId);
                  return (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="table-cell-muted">{category || '—'}</td>
                    <td className="table-cell font-medium">{m.name}</td>
                    <td className="table-cell-muted">{m.unit}</td>
                    <td className="table-cell-muted">{m.purchaseUnit ?? '—'}</td>
                    <td className="table-cell text-right">{Number(m.purchaseUnitRatio ?? 1)}</td>
                    <td className="table-cell-muted">{m.country ?? '—'}</td>
                    <td className="table-cell-muted max-w-[200px] truncate" title={m.description ?? ''}>{m.description ?? '—'}</td>
                    <td className="table-cell text-right">{formatNum(m.currentQuantity)}</td>
                    <td className="table-cell text-right">{formatMoney(Number(m.averageCost))}</td>
                    <td className="table-cell text-right">{formatNum(m.minStockThreshold)}</td>
                    <td className="table-cell text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 mr-1"
                      >
                        Изменить
                      </button>
                      {!m.isArchived && (
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(m.id)}
                          className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                        >
                          Удалить
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBlock>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="dialog-overlay" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="dialog-panel-lg max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="dialog-title">
                  {editing ? 'Редактировать материал' : 'Добавить в библиотеку'}
                </Dialog.Title>

                {/* 1. Основные данные */}
                <section className="mt-4">
                  <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Основные данные</h3>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/30 p-3 space-y-2.5">
                    <div>
                      <label className="label" id="material-group-label">Категория</label>
                      <ListboxSelect
                        value={form.materialGroup}
                        options={groupOptionsMat}
                        onChange={(id) => setForm((f) => ({ ...f, materialGroup: id }))}
                        placeholder="Напр. Адгезив"
                        buttonClassName="w-full"
                        aria-labelledby="material-group-label"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="material-name">Маркировка (Бренд)</label>
                      <input
                        id="material-name"
                        className="input"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Напр. Single Bond Universal (3M)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label" htmlFor="material-country">Страна</label>
                        <input
                          id="material-country"
                          className="input"
                          value={form.country}
                          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                          placeholder="США, Германия"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="material-threshold">Мин. остаток (порог)</label>
                        <input
                          id="material-threshold"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          className="input"
                          value={form.minStockThreshold}
                          onChange={(e) => setForm((f) => ({ ...f, minStockThreshold: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="material-description">Краткое назначение</label>
                      <input
                        id="material-description"
                        className="input"
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Напр. Универсальный бонд 8-го поколения"
                      />
                    </div>
                  </div>
                </section>

                {/* 2. Единицы измерения */}
                <section className="mt-4">
                  <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Единицы измерения</h3>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/30 p-3 space-y-2.5">
                    <p className="text-[11px] text-gray-500 -mt-0.5">
                      Учёт ведётся в двух уровнях: как приходит в накладной (закупка) и как выдаётся врачу (склад).
                    </p>
                    <div>
                      <label className="label" htmlFor="material-unit">Ед. учета (списания)</label>
                      <input
                        id="material-unit"
                        className="input"
                        value={form.unit}
                        onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                        placeholder="Карпула (шт), Флакон (шт), Шприц (шт)"
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block">В каких единицах списываем и выдаём врачу</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                      <div>
                        <label className="label" htmlFor="material-purchase-unit">Ед. закупки</label>
                        <input
                          id="material-purchase-unit"
                          className="input"
                          value={form.purchaseUnit}
                          onChange={(e) => setForm((f) => ({ ...f, purchaseUnit: e.target.value }))}
                          placeholder="Коробка (50), Флакон, Шприц"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">Как указано в накладной поставщика</span>
                      </div>
                      <div className="w-20">
                        <label className="label" htmlFor="material-purchase-ratio">В 1 закупке</label>
                        <input
                          id="material-purchase-ratio"
                          type="number"
                          inputMode="decimal"
                          min={0.0001}
                          step={1}
                          className="input text-center"
                          value={form.purchaseUnitRatio}
                          onChange={(e) => setForm((f) => ({ ...f, purchaseUnitRatio: Math.max(0.0001, parseFloat(e.target.value) || 1) }))}
                          placeholder="1"
                          title="Сколько ед. учета в 1 ед. закупки (50 = 1 коробка → 50 карпул)"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block text-center">ед. учета</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Статус */}
                <section className="mt-4">
                  <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Статус</h3>
                  <label className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/30 px-3 py-2 cursor-pointer hover:bg-gray-50/50">
                    <input
                      type="checkbox"
                      checked={form.isArchived}
                      onChange={(e) => setForm((f) => ({ ...f, isArchived: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    />
                    <span className="text-sm text-gray-700">В архиве</span>
                    <span className="text-[11px] text-gray-400">(материал скрыт из выбора в приходах и списаниях)</span>
                  </label>
                </section>
                {error && (
                  <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                    Отмена
                  </button>
                  <button type="button" onClick={save} className="btn-primary" disabled={saving}>
                    {saving ? 'Сохранение…' : 'Сохранить'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <Transition show={deleteConfirmId != null} as={Fragment}>
        <Dialog onClose={() => { setDeleteConfirmId(null); setDeleteError(''); }} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
                <Dialog.Title className="text-sm font-semibold text-gray-900">Удалить материал из списка?</Dialog.Title>
                {deleteError && <p className="mt-2 text-sm text-red-600" role="alert">{deleteError}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => { setDeleteConfirmId(null); setDeleteError(''); }} className="btn-secondary text-sm py-1.5 px-3">Отмена</button>
                  <button type="button" onClick={confirmRemove} className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Удалить</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
