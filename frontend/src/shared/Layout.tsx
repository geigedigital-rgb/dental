import { Outlet } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import { Disclosure } from '@headlessui/react';
import {
  HomeIcon,
  CubeIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ChevronDownIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CubeIcon as CubeIconSolid,
  TruckIcon as TruckIconSolid,
  WrenchScrewdriverIcon as WrenchIconSolid,
  BanknotesIcon as BanknotesIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as CogIconSolid,
  BuildingLibraryIcon as BuildingLibraryIconSolid,
} from '@heroicons/react/24/solid';
import { useAuthStore } from './store/authStore';

const nav = [
  { to: '/dashboard', label: 'Главная', Icon: HomeIcon, IconActive: HomeIconSolid },
  { to: '/warehouse', label: 'Склад', Icon: BuildingLibraryIcon, IconActive: BuildingLibraryIconSolid },
  { to: '/materials', label: 'Библиотека материалов', Icon: CubeIcon, IconActive: CubeIconSolid },
  { to: '/suppliers', label: 'Поставщики', Icon: TruckIcon, IconActive: TruckIconSolid },
  { to: '/services', label: 'Услуги', Icon: WrenchScrewdriverIcon, IconActive: WrenchIconSolid },
  { to: '/sales', label: 'Продажи и списания', Icon: BanknotesIcon, IconActive: BanknotesIconSolid },
  { to: '/reports', label: 'Отчёты', Icon: ChartBarIcon, IconActive: ChartBarIconSolid },
  { to: '/settings', label: 'Настройки', Icon: Cog6ToothIcon, IconActive: CogIconSolid },
];

export function Layout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex bg-[#EDF6FE]">
      <aside className="w-52 flex flex-col border-r border-gray-200 bg-white shadow-sm">
        <div className="flex h-12 items-center gap-2 border-b border-gray-100 px-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-white">
            <CubeIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">Склад клиники</p>
            <p className="text-[11px] text-gray-500">Учёт и финансы</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-1.5 px-1.5" aria-label="Основное меню">
          <p className="mb-0.5 px-2.5 text-[11px] font-medium text-gray-400">
            Основное
          </p>
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const active = location.pathname === item.to;
              const Icon = active ? item.IconActive : item.Icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 ${
                      active
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-gray-100 p-2">
          <Disclosure as="div">
            <Disclosure.Button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <UserCircleIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-900">
                  {user?.fullName ?? 'Пользователь'}
                </p>
                <p className="truncate text-[11px] text-gray-500">{user?.email ?? ''}</p>
              </div>
              <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </Disclosure.Button>
            <Disclosure.Panel className="pt-0.5">
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-md px-2.5 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
              >
                Выйти
              </button>
            </Disclosure.Panel>
          </Disclosure>
        </div>
      </aside>
      <main className="flex-1 overflow-auto" id="main-content">
        <div className="p-4 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
