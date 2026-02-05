import { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { TruckIcon } from '@heroicons/react/24/outline';
import { suppliersApi } from '../../shared/api/client';
import { PageHeader } from '../../shared/PageHeader';
import { CardBlock } from '../../shared/CardBlock';

export function SuppliersPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', contactInfo: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    setLoading(true);
    suppliersApi.list().then(setList).finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', contactInfo: '' });
    setError('');
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, contactInfo: s.contactInfo ?? '' });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await suppliersApi.update(editing.id, form);
      } else {
        await suppliersApi.create(form);
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
      await suppliersApi.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      load();
    } catch (e: any) {
      setDeleteError(e.response?.data?.message ?? 'Ошибка удаления');
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Поставщики"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Поставщики' }]}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            Добавить поставщика
          </button>
        }
      />

      <CardBlock title="Список поставщиков" icon={<TruckIcon className="h-4 w-4" />}>
        {loading ? (
          <p className="py-4 text-center text-xs text-gray-500">Загрузка…</p>
        ) : (
          <div className="table-wrap -mx-3 -mb-3">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-head">Название</th>
                  <th className="table-head">Контакты</th>
                  <th className="table-head text-right">Поставок</th>
                  <th className="table-head text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="table-cell font-medium">{s.name}</td>
                    <td className="table-cell-muted whitespace-pre-wrap">{s.contactInfo ?? '—'}</td>
                    <td className="table-cell text-right">{s._count?.stockEntries ?? 0}</td>
                    <td className="table-cell text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 mr-1"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(s.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                    >
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

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="dialog-overlay" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dialog-panel">
                <Dialog.Title className="dialog-title">
                  {editing ? 'Редактировать поставщика' : 'Новый поставщик'}
                </Dialog.Title>
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="label">Название</label>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Контакты (телефон, email, адрес)</label>
                    <textarea
                      className="input min-h-[60px] text-sm"
                      value={form.contactInfo}
                      onChange={(e) => setForm((f) => ({ ...f, contactInfo: e.target.value }))}
                    />
                  </div>
                </div>
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Отмена</button>
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
                <Dialog.Title className="text-sm font-semibold text-gray-900">Удалить поставщика?</Dialog.Title>
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
