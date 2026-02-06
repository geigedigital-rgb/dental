/**
 * Одноразовый скрипт: выравнивает остаток по движениям с суммой по партиям
 * для указанных материалов — создаёт списание (WriteOff + OUT движение) на разницу.
 * Запуск: cd backend && npx ts-node -r tsconfig-paths/register scripts/clear-excess-balance.ts
 * Или: DATABASE_URL="..." npx ts-node scripts/clear-excess-balance.ts
 * Требует: npm install -D tsconfig-paths (или запуск из корня backend с правильным путём к prisma).
 */
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const MATERIAL_NAMES = [
  'OptiBond Solo Plus (Kerr)',
  'Septanest (Septodont)',
  'RelyX U200 Automix (3M)',
];

async function main() {
  const prisma = new PrismaClient();

  const materials = await prisma.material.findMany({
    where: { name: { in: MATERIAL_NAMES }, deletedAt: null },
    select: { id: true, name: true, averageCost: true },
  });

  if (materials.length === 0) {
    console.log('Материалы не найдены по именам:', MATERIAL_NAMES);
    await prisma.$disconnect();
    return;
  }

  const writeOffDate = new Date();
  const reason = 'Выравнивание остатка с партиями (одноразовая корректировка)';

  for (const mat of materials) {
    const [inAgg, outAgg, lotsAgg] = await Promise.all([
      prisma.stockMovement.aggregate({
        where: { materialId: mat.id, type: 'IN', deletedAt: null },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: { materialId: mat.id, type: 'OUT', deletedAt: null },
        _sum: { quantity: true },
      }),
      prisma.materialLot.aggregate({
        where: { materialId: mat.id },
        _sum: { quantity: true },
      }),
    ]);

    const balance = Number(inAgg._sum.quantity ?? 0) - Number(outAgg._sum.quantity ?? 0);
    const lotsSum = Number(lotsAgg._sum.quantity ?? 0);
    const excess = balance - lotsSum;

    if (excess <= 0) {
      console.log(`${mat.name}: остаток ${balance}, в партиях ${lotsSum}, корректировка не нужна`);
      continue;
    }

    console.log(`${mat.name}: остаток ${balance}, в партиях ${lotsSum}, списываем избыток ${excess}`);

    const unitCost = new Decimal(Number(mat.averageCost) || 0);

    const writeOff = await prisma.writeOff.create({
      data: {
        materialId: mat.id,
        quantity: new Decimal(excess),
        reason,
        writeOffDate,
      },
    });

    await prisma.stockMovement.create({
      data: {
        materialId: mat.id,
        type: 'OUT',
        quantity: new Decimal(excess),
        unitCost,
        sourceType: 'WRITE_OFF',
        sourceId: writeOff.id,
        writeOffId: writeOff.id,
        movementDate: writeOffDate,
        note: reason,
      },
    });

    // Пересчёт средневзвешенной стоимости (WAC)
    const movements = await prisma.stockMovement.findMany({
      where: { materialId: mat.id, deletedAt: null },
      select: { type: true, quantity: true, unitCost: true },
    });
    let valueIn = 0,
      valueOut = 0,
      qtyIn = 0,
      qtyOut = 0;
    for (const m of movements) {
      const q = Number(m.quantity);
      const v = q * Number(m.unitCost);
      if (m.type === 'IN') {
        qtyIn += q;
        valueIn += v;
      } else {
        qtyOut += q;
        valueOut += v;
      }
    }
    const totalQty = qtyIn - qtyOut;
    const totalValue = valueIn - valueOut;
    const newWac = totalQty > 0 ? totalValue / totalQty : 0;
    await prisma.material.update({
      where: { id: mat.id },
      data: { averageCost: new Decimal(newWac) },
    });

    console.log(`  Создано списание ${writeOff.id}, новый WAC: ${newWac.toFixed(2)}`);
  }

  await prisma.$disconnect();
  console.log('Готово.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
