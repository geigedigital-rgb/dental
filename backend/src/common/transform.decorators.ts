import { Transform } from 'class-transformer';

export function ToDecimal() {
  return Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    const { Decimal } = require('@prisma/client/runtime/library');
    return new Decimal(String(value));
  });
}

export function ToDate() {
  return Transform(({ value }) => (value ? new Date(value) : value));
}
