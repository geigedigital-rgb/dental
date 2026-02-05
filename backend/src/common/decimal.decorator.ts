import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export function toDecimal(value: string | number): import('@prisma/client/runtime/library').Decimal {
  const { Decimal } = require('@prisma/client/runtime/library');
  return new Decimal(value);
}

export function decimalToNumber(d: { toNumber: () => number } | number): number {
  if (typeof d === 'number') return d;
  return d?.toNumber?.() ?? 0;
}
