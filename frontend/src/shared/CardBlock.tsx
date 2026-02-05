import { type ReactNode } from 'react';

type CardBlockProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CardBlock({ title, icon, children, className = '' }: CardBlockProps) {
  return (
    <div className={`rounded-lg border border-gray-100 bg-white ${className}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        {icon && (
          <span className="flex shrink-0 items-center justify-center text-gray-400 [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
        <h2 className="text-xs font-medium leading-5 text-gray-900">{title}</h2>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
