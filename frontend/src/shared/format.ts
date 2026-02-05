/** Форматирование денег в гривнах (UAH), стиль HeadlessUI — без лишнего декора */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(Number(value));
}
