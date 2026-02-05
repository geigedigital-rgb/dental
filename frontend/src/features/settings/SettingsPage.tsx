import { useState, useEffect } from 'react';
import { UserCircleIcon, InformationCircleIcon, CubeIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../shared/store/authStore';
import { PageHeader } from '../../shared/PageHeader';
import { CardBlock } from '../../shared/CardBlock';
import { ListboxSelect } from '../../shared/ListboxSelect';
import { settingsApi, type InventorySettings } from '../../shared/api/client';

const WRITE_OFF_OPTIONS = [
  { id: 'FIFO', name: 'Партионный (FIFO)' },
  { id: 'AVERAGE', name: 'Средняя цена' },
];
const LOT_TRACKING_OPTIONS = [
  { id: 'false', name: 'Выключен' },
  { id: 'true', name: 'Включен' },
];
const EXPIRY_RULE_OPTIONS = [
  { id: 'NONE', name: 'Нет' },
  { id: 'FEFO', name: 'FEFO' },
];

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [inv, setInv] = useState<InventorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    settingsApi
      .getInventory()
      .then(setInv)
      .catch(() => setInv(null))
      .finally(() => setLoading(false));
  }, []);

  const updateLocal = (patch: Partial<InventorySettings>) => {
    if (!inv) return;
    const next = { ...inv, ...patch };
    const willDisableFefo =
      (patch.writeOffMethod === 'AVERAGE' || patch.lotTracking === false) &&
      (next.writeOffMethod === 'AVERAGE' || !next.lotTracking);
    if (willDisableFefo && next.expiryRule === 'FEFO') {
      next.expiryRule = 'NONE';
    }
    setInv(next);
    setDirty(true);
  };

  const saveInventory = () => {
    if (!inv || !dirty) return;
    setSaving(true);
    settingsApi
      .patchInventory(inv)
      .then(setInv)
      .then(() => setDirty(false))
      .finally(() => setSaving(false));
  };

  const canUseFefo = inv?.lotTracking && inv?.writeOffMethod === 'FIFO';

  return (
    <div className="space-y-3 max-w-2xl">
      <PageHeader
        title="Настройки"
        breadcrumbs={[{ label: 'Главная', to: '/dashboard' }, { label: 'Настройки' }]}
      />

      <CardBlock title="Профиль" icon={<UserCircleIcon className="h-4 w-4" />}>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="border-b border-gray-100 pb-2">
            <dt className="text-xs font-medium text-gray-500">Имя</dt>
            <dd className="mt-0.5 text-xs font-medium text-gray-900">{user?.fullName ?? '—'}</dd>
          </div>
          <div className="border-b border-gray-100 pb-2">
            <dt className="text-xs font-medium text-gray-500">Email</dt>
            <dd className="mt-0.5 text-xs font-medium text-gray-900">{user?.email ?? '—'}</dd>
          </div>
          <div className="pb-2 sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500">Роль</dt>
            <dd className="mt-0.5 text-xs font-medium text-gray-900">{user?.role?.name ?? '—'}</dd>
          </div>
        </dl>
      </CardBlock>

      <CardBlock title="Учёт склада" icon={<CubeIcon className="h-4 w-4" />}>
        {loading ? (
          <p className="text-xs text-gray-500">Загрузка…</p>
        ) : inv ? (
          <div className="space-y-4">
            <div>
              <ListboxSelect
                label="Тип списания"
                value={inv.writeOffMethod}
                options={WRITE_OFF_OPTIONS}
                onChange={(id) => updateLocal({ writeOffMethod: id as 'FIFO' | 'AVERAGE' })}
              />
              <p className="mt-1 text-xs text-gray-500">
                {inv.writeOffMethod === 'FIFO'
                  ? 'Списываем строго по ценам прихода в хронологическом порядке.'
                  : 'Система сама пересчитывает общую стоимость остатков при каждом новом приходе.'}
              </p>
            </div>
            <div>
              <ListboxSelect
                label="Учёт партий"
                value={String(inv.lotTracking)}
                options={LOT_TRACKING_OPTIONS}
                onChange={(id) => updateLocal({ lotTracking: id === 'true' })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Программа хранит каждую покупку как отдельную строку с датой, ценой и сроком годности.
              </p>
            </div>
            <div>
              <ListboxSelect
                label="Привязка к сроку"
                value={canUseFefo ? inv.expiryRule : 'NONE'}
                options={EXPIRY_RULE_OPTIONS}
                onChange={(id) => updateLocal({ expiryRule: id as 'FEFO' | 'NONE' })}
                disabled={!canUseFefo}
              />
              <p className="mt-1 text-xs text-gray-500">
                {canUseFefo
                  ? 'Вариант FIFO: первым списывается то, что быстрее портится (First Expired, First Out).'
                  : 'Доступно при включённом учёте партий и типе списания «Партионный (FIFO)».'}
              </p>
            </div>
            {dirty && (
              <button
                type="button"
                onClick={saveInventory}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : (
                  <>
                    <CheckIcon className="h-3.5 w-3.5" />
                    Сохранить настройки склада
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">Не удалось загрузить настройки.</p>
        )}
      </CardBlock>

      <CardBlock title="О системе" icon={<InformationCircleIcon className="h-4 w-4" />}>
        <p className="text-xs text-gray-600 leading-relaxed">
          Склад и финансы — система учёта материалов и финансов стоматологической клиники.
          Учёт приходов, списаний, продаж услуг с расчётом себестоимости (WAC), маржи и рентабельности.
        </p>
      </CardBlock>
    </div>
  );
}
