import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

export type BreadcrumbItem = { label: string; to?: string };

type PageHeaderProps = {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
};

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-0.5 text-xs text-gray-500 mb-0.5" aria-label="Хлебные крошки">
            {breadcrumbs.map((item, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />}
                {item.to ? (
                  <Link to={item.to} className="hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 rounded">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-900">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-base font-medium leading-5 text-gray-900">{title}</h1>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
