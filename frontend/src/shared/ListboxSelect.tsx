import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { Fragment, useId } from 'react';

export type ListboxOption = { id: string; name: string };

type ListboxSelectProps = {
  value: string;
  options: ListboxOption[];
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
};

export function ListboxSelect({
  value,
  options,
  onChange,
  label,
  placeholder = 'Выберите…',
  className = '',
  buttonClassName = '',
  disabled = false,
}: ListboxSelectProps) {
  const id = useId();
  const labelId = label ? `${id}-label` : undefined;
  const selected = options.find((o) => o.id === value);

  return (
    <div className={className}>
      {label && (
        <label className="block text-[11px] font-medium text-gray-500 mb-0.5" id={labelId}>
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled} aria-labelledby={labelId}>
        <div className="relative">
          <Listbox.Button
            className={`input flex items-center justify-between text-left pr-8 min-h-[34px] ${buttonClassName}`}
          >
            <span className={selected ? 'font-medium text-gray-900' : 'font-normal text-gray-400'}>
              {selected?.name ?? placeholder}
            </span>
            <span className="pointer-events-none flex items-center pr-2 text-gray-400" aria-hidden>
              <ChevronUpDownIcon className="h-4 w-4" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className="absolute z-50 mt-0.5 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white py-0.5 text-sm shadow-sm focus:outline-none"
            >
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.id}
                  value={opt.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-3 pr-9 border-b border-gray-50 last:border-b-0 ${active ? 'bg-gray-50' : ''}`
                  }
                >
                  {({ selected: sel }) => (
                    <>
                      <span
                        className={`block truncate ${sel ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'}`}
                      >
                        {opt.name}
                      </span>
                      {sel ? (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600" aria-hidden>
                          <CheckIcon className="h-4 w-4" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
