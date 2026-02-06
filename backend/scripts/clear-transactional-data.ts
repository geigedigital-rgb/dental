/**
 * Очистка БД от всех транзакционных данных. Справочники остаются.
 * Удаляются: приходы, партии, движения, списания, продажи услуг, аудит.
 * Остаются: пользователи, роли, типы материалов, материалы, поставщики, услуги (и состав), настройки.
 *
 * Запуск: cd backend && npm run script:clear-transactional-data
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('Очистка транзакционных данных…');

  // Порядок важен из‑за внешних ключей: сначала зависимые, потом родители.

  const deletedAudit = await prisma.auditLog.deleteMany({});
  console.log(`  AuditLog: ${deletedAudit.count}`);

  const deletedMovements = await prisma.stockMovement.deleteMany({});
  console.log(`  StockMovement: ${deletedMovements.count}`);

  const deletedSnapshots = await prisma.serviceSaleMaterialSnapshot.deleteMany({});
  console.log(`  ServiceSaleMaterialSnapshot: ${deletedSnapshots.count}`);

  const deletedSales = await prisma.serviceSale.deleteMany({});
  console.log(`  ServiceSale: ${deletedSales.count}`);

  const deletedWriteOffs = await prisma.writeOff.deleteMany({});
  console.log(`  WriteOff: ${deletedWriteOffs.count}`);

  const deletedLots = await prisma.materialLot.deleteMany({});
  console.log(`  MaterialLot: ${deletedLots.count}`);

  const deletedEntryItems = await prisma.stockEntryItem.deleteMany({});
  console.log(`  StockEntryItem: ${deletedEntryItems.count}`);

  const deletedEntries = await prisma.stockEntry.deleteMany({});
  console.log(`  StockEntry: ${deletedEntries.count}`);

  await prisma.material.updateMany({
    data: { averageCost: 0 },
  });
  console.log('  Material.averageCost обнулён');

  await prisma.$disconnect();
  console.log('Готово. Справочники (типы материалов, материалы, поставщики, услуги, настройки, пользователи) сохранены.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
