import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { WrenchScrewdriverIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { servicesApi, materialsApi, materialTypesApi } from '../../shared/api/client';
import { formatMoney } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';
import { CardBlock } from '../../shared/CardBlock';
import { ListboxSelect } from '../../shared/ListboxSelect';

type MaterialRow = { rowId: string; category: string; materialId: string; quantity: number };

const emptyForm = {
  name: '',
  description: '',
  basePrice: '' as string,
  materials: [] as MaterialRow[],
};

export function ServicesPage() {
  const [list, setList] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([servicesApi.list(), materialTypesApi.list(), materialsApi.list()])
      .then(([services, types, mats]) => {
        setList(services);
        setMaterialTypes(types || []);
        setMaterials(mats || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const getCategoryForMaterial = (materialId: string) => {
    const m = materials.find((x) => x.id === materialId);
    const typeId = m?.materialTypeId ?? m?.materialType?.id ?? '';
    const t = materialTypes.find((x) => x.id === typeId);
    return t ? t.name.split(' ')[0] ?? '' : '';
  };
  const categories = [...new Set(materialTypes.map((t) => t.name.split(' ')[0]).filter(Boolean))].sort();
  const getMaterialsInCategory = (category: string) => {
    const typeIds = materialTypes.filter((t) => t.name === category || t.name.startsWith(category + ' ')).map((t) => t.id);
    return materials.filter((m) => typeIds.includes(m.materialTypeId ?? m.materialType?.id ?? ''));
  };

  const toNum = (v: any): number => {
    if (v == null) return 0;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = typeof v === 'object' && v != null && typeof v.toString === 'function' ? parseFloat(v.toString()) : parseFloat(String(v));
    return Number.isNaN(n) ? 0 : n;
  };

  const openEdit = (s: any) => {
    setEditing(s);
    const price = toNum(s.basePrice);
    setForm({
      name: s.name,
      description: s.description ?? '',
      basePrice: price > 0 ? String(price) : '',
      materials: (s.materials ?? []).map((m: any, idx: number) => ({
        rowId: `edit-${m.materialId}-${idx}-${Date.now()}`,
        category: getCategoryForMaterial(m.materialId),
        materialId: m.materialId,
        quantity: Math.max(0.0001, toNum(m.quantity)) || 1,
      })),
    });
    setError('');
    setOpen(true);
  };

  const addMaterialRow = () => {
    const firstCat = categories[0] ?? '';
    setForm((f) => ({
      ...f,
      materials: [...f.materials, { rowId: `new-${Date.now()}`, category: firstCat, materialId: '', quantity: 1 }],
    }));
  };

  const removeMaterialRow = (rowId: string) => {
    setForm((f) => ({ ...f, materials: f.materials.filter((row) => row.rowId !== rowId) }));
  };

  const updateMaterialRow = (i: number, field: 'category' | 'materialId' | 'quantity', value: string | number) => {
    setForm((f) => ({
      ...f,
      materials: f.materials.map((row, idx) => {
        if (idx !== i) return row;
        if (field === 'category') return { ...row, category: value as string, materialId: '' };
        if (field === 'materialId') return { ...row, materialId: value as string };
        const num = value === '' || value === null ? 0 : Number(value);
        return { ...row, quantity: Number.isNaN(num) ? 0 : num };
      }),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const basePriceNum = Math.max(0, toNum(form.basePrice));
      const materialsPayload = form.materials
        .filter((m) => m.materialId && toNum(m.quantity) >= 0.0001)
        .map((m) => ({
          materialId: String(m.materialId),
          quantity: Number(Math.max(0.0001, toNum(m.quantity))),
        }));
      const payload = {
        name: String(form.name).trim(),
        description: form.description ? String(form.description).trim() : undefined,
        basePrice: Number(basePriceNum),
        materials: materialsPayload,
      };
      if (editing) {
        await servicesApi.update(editing.id, payload);
      } else {
        await servicesApi.create(payload);
      }
      setOpen(false);
      setEditing(null);
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
      await servicesApi.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      load();
    } catch (e: any) {
      setDeleteError(e.response?.data?.message ?? 'Ошибка удаления');
    }
  };

  const formatPrice = (v: any) => formatMoney(v != null ? Number(v) : undefined);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Услуги"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Услуги' }]}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            Добавить услугу
          </button>
        }
      />

      <div className={`grid gap-4 ${open ? 'grid-cols-[40%_1fr]' : 'grid-cols-1'}`}>
        <div className={open ? 'min-w-0' : ''}>
          <CardBlock title="Список услуг" icon={<WrenchScrewdriverIcon className="h-4 w-4" />}>
            {loading ? (
              <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
            ) : (
              <div className="table-wrap -mx-3 -mb-3">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="table-head">Название</th>
                      <th className="table-head">Базовая цена</th>
                      <th className="table-head text-right">Себестоимость мат.</th>
                      <th className="table-head text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr
                        key={s.id}
                        className={`hover:bg-gray-50/50 ${editing?.id === s.id ? 'bg-gray-50' : ''}`}
                      >
                        <td className="table-cell font-medium">{s.name}</td>
                        <td className="table-cell">{formatPrice(s.basePrice)}</td>
                        <td className="table-cell text-right">{formatPrice(s.currentMaterialCost)}</td>
                        <td className="table-cell text-right">
                          <button type="button" onClick={() => openEdit(s)} className="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 mr-1">
                            Изменить
                          </button>
                          <button type="button" onClick={() => openDeleteConfirm(s.id)} className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2">
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBlock>
        </div>

        {open && (
          <div className="min-w-0 rounded-lg border border-gray-100 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <h2 className="text-xs font-medium leading-5 text-gray-900">
                {editing ? 'Редактировать услугу' : 'Новая услуга'}
              </h2>
              <button
                type="button"
                onClick={() => { setOpen(false); setEditing(null); setError(''); }}
                className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                aria-label="Закрыть панель"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-3">
                {editing ? 'Измените данные услуги. Состав материалов влияет на расчёт себестоимости при продаже.' : 'Добавьте услугу: название, цену и список материалов с нормами расхода для расчёта себестоимости.'}
              </p>

              <section className="space-y-2" aria-labelledby="service-basic-heading">
                <h3 id="service-basic-heading" className="text-xs font-medium text-gray-700 border-b border-gray-100 pb-1.5">Основные данные</h3>
                <div>
                  <label htmlFor="service-name" className="label">Название услуги</label>
                  <p className="text-xs text-gray-500 mb-1">Как будет отображаться в прайсе и в продажах</p>
                  <input id="service-name" className="input" placeholder="Например: Лечение кариеса" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="service-desc" className="label">Описание</label>
                  <p className="text-xs text-gray-500 mb-1">Необязательно: внутренняя пометка или расшифровка</p>
                  <input id="service-desc" className="input" placeholder="Краткое описание" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="service-price" className="label">Базовая цена (грн)</label>
                  <p className="text-xs text-gray-500 mb-1">Цена по умолчанию при создании продажи этой услуги</p>
                  <input
                    id="service-price"
                    type="text"
                    inputMode="decimal"
                    className="input w-40"
                    placeholder="0"
                    value={form.basePrice}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, basePrice: v }));
                    }}
                  />
                </div>
              </section>

                <section className="mt-3" aria-labelledby="service-materials-heading">
                <div>
                  <h3 id="service-materials-heading" className="text-xs font-medium text-gray-700">Состав материалов</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Категория → маркировка (бренд). Нормы расхода для расчёта себестоимости.</p>
                </div>
                {form.materials.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500 bg-gray-50/80 rounded border border-gray-100 px-3 py-2">Позиций пока нет. Добавьте материал кнопкой ниже.</p>
                ) : null}
                {form.materials.length > 0 ? (
                  <ul className="mt-2 space-y-1.5" role="list">
                    {form.materials.map((row, i) => (
                      <li key={row.rowId} className="flex flex-wrap gap-2 items-center p-1.5 rounded bg-gray-50/50 border border-gray-100">
                        <ListboxSelect
                          value={row.category}
                          options={categories.map((g) => ({ id: g, name: g }))}
                          onChange={(id) => updateMaterialRow(i, 'category', id)}
                          placeholder="Категория"
                          className="w-[120px]"
                        />
                        <ListboxSelect
                          value={row.materialId}
                          options={getMaterialsInCategory(row.category).map((m) => ({ id: m.id, name: m.name }))}
                          onChange={(id) => updateMaterialRow(i, 'materialId', id)}
                          placeholder="Маркировка (Бренд)"
                          className="flex-1 min-w-0"
                        />
                        <label htmlFor={`service-qty-${row.rowId}`} className="sr-only">Количество</label>
                        <input
                          id={`service-qty-${row.rowId}`}
                          type="text"
                          inputMode="decimal"
                          className="input w-24"
                          placeholder="1"
                          value={row.quantity === 0 ? '' : row.quantity}
                          onChange={(e) => {
                            const v = e.target.value.replace(',', '.');
                            if (v === '' || /^\d*\.?\d*$/.test(v)) updateMaterialRow(i, 'quantity', v === '' ? 0 : v);
                          }}
                        />
                        <span className="text-xs text-gray-500 shrink-0 w-16">ед.</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeMaterialRow(row.rowId);
                          }}
                          className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                          aria-label="Удалить строку"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2">
                  <button type="button" onClick={addMaterialRow} className="text-sm font-medium rounded-md px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1">
                    + Добавить материал
                  </button>
                </div>
              </section>

              {error && <p className="mt-3 text-xs text-gray-700 rounded bg-gray-100 px-2 py-1.5" role="alert">{error}</p>}
              <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => { setOpen(false); setEditing(null); setError(''); }} className="btn-secondary">Отмена</button>
                <button type="button" onClick={save} className="btn-primary" disabled={saving}>
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Transition show={deleteConfirmId != null} as={Fragment}>
        <Dialog onClose={() => { setDeleteConfirmId(null); setDeleteError(''); }} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
                <Dialog.Title className="text-sm font-semibold text-gray-900">Удалить услугу?</Dialog.Title>
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
