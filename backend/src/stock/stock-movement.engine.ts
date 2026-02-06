import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { Decimal } from '@prisma/client/runtime/library';
import { StockMovementType, StockMovementSourceType } from '@prisma/client';

type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class StockMovementEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Регистрация прихода: создаёт entry, items, движение IN, при FIFO/учёте партий — партию (MaterialLot), пересчитывает WAC при средней цене.
   */
  async registerGoodsReceipt(params: {
    supplierId: string;
    entryDate: Date;
    note?: string;
    deliveryCost?: Decimal;
    items: { materialId: string; quantity: Decimal; unitPrice: Decimal; expiryDate?: Date | null }[];
    createdById?: string;
  }) {
    if (!params.items.length) {
      throw new BadRequestException('Добавьте хотя бы одну позицию');
    }
    const inv = await this.settings.getInventorySettings();
    const useLots = inv.writeOffMethod === 'FIFO' || inv.lotTracking;

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.stockEntry.create({
        data: {
          supplierId: params.supplierId,
          entryDate: params.entryDate,
          note: params.note ?? null,
          deliveryCost: params.deliveryCost ?? new Decimal(0),
          createdById: params.createdById ?? null,
        },
      });
      for (const item of params.items) {
        const entryItem = await tx.stockEntryItem.create({
          data: {
            stockEntryId: entry.id,
            materialId: item.materialId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            expiryDate: item.expiryDate ?? null,
          },
        });
        if (useLots) {
          await tx.materialLot.create({
            data: {
              materialId: item.materialId,
              quantity: item.quantity,
              unitCost: item.unitPrice,
              receivedAt: params.entryDate,
              expiryDate: item.expiryDate ?? null,
              stockEntryId: entry.id,
              stockEntryItemId: entryItem.id,
            },
          });
        }
        await this.recordMovementAndUpdateWac(tx, {
          materialId: item.materialId,
          type: 'IN',
          quantity: item.quantity,
          unitCost: item.unitPrice,
          sourceType: StockMovementSourceType.STOCK_ENTRY,
          sourceId: entry.id,
          stockEntryId: entry.id,
          movementDate: params.entryDate,
          note: params.note ?? null,
        });
      }
      return tx.stockEntry.findUnique({
        where: { id: entry.id },
        include: { items: { include: { material: true } }, supplier: true },
      });
    });
  }

  /**
   * Ручное списание: проверка остатка. Если передан materialLotId — списание только с этой партии; иначе по FIFO или по средней.
   */
  async registerWriteOff(params: {
    materialId: string;
    materialLotId?: string;
    quantity: Decimal;
    reason: string;
    writeOffDate: Date;
    createdById?: string;
  }) {
    const material = await this.prisma.material.findFirst({
      where: { id: params.materialId, deletedAt: null },
    });
    if (!material) throw new BadRequestException('Материал не найден');
    const qty = Number(params.quantity);

    if (params.materialLotId) {
      const lot = await this.prisma.materialLot.findFirst({
        where: { id: params.materialLotId, materialId: params.materialId, quantity: { gt: 0 } },
      });
      if (!lot) {
        throw new BadRequestException('Партия не найдена или в ней нет остатка');
      }
      const lotQty = Number(lot.quantity);
      if (lotQty < qty) {
        throw new BadRequestException(
          `Недостаточно в выбранной партии. В партии: ${lotQty}, запрошено: ${qty}`,
        );
      }
      return this.prisma.$transaction(async (tx) => {
        const writeOff = await tx.writeOff.create({
          data: {
            materialId: params.materialId,
            materialLotId: params.materialLotId,
            quantity: params.quantity,
            reason: params.reason,
            writeOffDate: params.writeOffDate,
            createdById: params.createdById ?? null,
          },
        });
        await this.recordMovementAndUpdateWac(tx, {
          materialId: params.materialId,
          type: StockMovementType.OUT,
          quantity: params.quantity,
          unitCost: lot.unitCost,
          sourceType: StockMovementSourceType.WRITE_OFF,
          sourceId: writeOff.id,
          writeOffId: writeOff.id,
          movementDate: params.writeOffDate,
          note: params.reason,
        });
        const newLotQty = lotQty - qty;
        if (newLotQty <= 0) {
          await tx.materialLot.delete({ where: { id: lot.id } });
        } else {
          await tx.materialLot.update({
            where: { id: lot.id },
            data: { quantity: new Decimal(newLotQty) },
          });
        }
        return tx.writeOff.findUnique({
          where: { id: writeOff.id },
          include: { material: true, materialLot: true },
        });
      });
    }

    const balance = await this.getBalanceForMaterial(this.prisma, params.materialId);
    if (balance < qty) {
      throw new BadRequestException(
        `Недостаточно остатка. Доступно: ${balance}, запрошено: ${qty}`,
      );
    }
    const inv = await this.settings.getInventorySettings();
    const useFifo = inv.writeOffMethod === 'FIFO';

    return this.prisma.$transaction(async (tx) => {
      let unitCost: Decimal;
      if (useFifo) {
        const cost = await this.consumeFromLots(tx, params.materialId, qty);
        unitCost = new Decimal(cost);
      } else {
        unitCost = (material.averageCost ?? new Decimal(0)) as Decimal;
      }
      const writeOff = await tx.writeOff.create({
        data: {
          materialId: params.materialId,
          quantity: params.quantity,
          reason: params.reason,
          writeOffDate: params.writeOffDate,
          createdById: params.createdById ?? null,
        },
      });
      await this.recordMovementAndUpdateWac(tx, {
        materialId: params.materialId,
        type: StockMovementType.OUT,
        quantity: params.quantity,
        unitCost,
        sourceType: StockMovementSourceType.WRITE_OFF,
        sourceId: writeOff.id,
        writeOffId: writeOff.id,
        movementDate: params.writeOffDate,
        note: params.reason,
      });
      return tx.writeOff.findUnique({
        where: { id: writeOff.id },
        include: { material: true },
      });
    });
  }

  /**
   * Списание по продаже услуги: при FIFO списываем из партий и берём цену из партий, иначе используем переданную unitCost (WAC).
   */
  async registerServiceSaleDeduction(params: {
    serviceSaleId: string;
    items: { materialId: string; quantity: Decimal; unitCost: Decimal }[];
    movementDate: Date;
  }) {
    const inv = await this.settings.getInventorySettings();
    const useFifo = inv.writeOffMethod === 'FIFO';

    return this.prisma.$transaction(async (tx) => {
      for (const item of params.items) {
        const balance = await this.getBalanceForMaterial(tx, item.materialId);
        if (balance < Number(item.quantity)) {
          throw new BadRequestException(
            `Недостаточно остатка материала для списания по услуге. materialId: ${item.materialId}`,
          );
        }
        const unitCost = useFifo
          ? new Decimal(await this.consumeFromLots(tx, item.materialId, Number(item.quantity)))
          : item.unitCost;
        await this.recordMovementAndUpdateWac(tx, {
          materialId: item.materialId,
          type: StockMovementType.OUT,
          quantity: item.quantity,
          unitCost,
          sourceType: StockMovementSourceType.SERVICE_SALE,
          sourceId: params.serviceSaleId,
          serviceSaleId: params.serviceSaleId,
          movementDate: params.movementDate,
          note: 'Списание по оказанию услуги',
        });
      }
    });
  }

  /**
   * Списывает количество из партий (FEFO или FIFO), возвращает средневзвешенную цену списания.
   */
  private async consumeFromLots(tx: TxClient, materialId: string, quantity: number): Promise<number> {
    const inv = await this.settings.getInventorySettings();
    const orderBy: any[] =
      inv.expiryRule === 'FEFO'
        ? [{ expiryDate: 'asc' as const }, { receivedAt: 'asc' as const }]
        : [{ receivedAt: 'asc' as const }];

    const lots = await tx.materialLot.findMany({
      where: { materialId, quantity: { gt: 0 } },
      orderBy,
    });
    let remaining = quantity;
    let totalValue = 0;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const q = Math.min(remaining, Number(lot.quantity));
      const cost = Number(lot.unitCost);
      totalValue += q * cost;
      remaining -= q;
      const newQty = Number(lot.quantity) - q;
      if (newQty <= 0) {
        await tx.materialLot.delete({ where: { id: lot.id } });
      } else {
        await tx.materialLot.update({
          where: { id: lot.id },
          data: { quantity: new Decimal(newQty) },
        });
      }
    }
    if (remaining > 0) {
      const material = await tx.material.findFirst({
        where: { id: materialId, deletedAt: null },
        select: { name: true },
      });
      const name = material?.name ?? materialId;
      throw new BadRequestException(
        `Списание по FIFO идёт по партиям (дата прихода / срок годности), а не по общему остатку. По материалу «${name}» в партиях не хватает ${remaining} ед. Проверьте Склад → выберите материал → раздел «Партии»: там должно быть достаточно количества в партиях. Если партии не ведутся или рассинхронизированы с остатком — в Настройках можно перейти на учёт по средней.`,
      );
    }
    return quantity > 0 ? totalValue / quantity : 0;
  }

  private async recordMovementAndUpdateWac(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    params: {
      materialId: string;
      type: StockMovementType;
      quantity: Decimal;
      unitCost: Decimal;
      sourceType: StockMovementSourceType;
      sourceId: string;
      stockEntryId?: string;
      writeOffId?: string;
      serviceSaleId?: string;
      movementDate: Date;
      note?: string | null;
    },
  ) {
    await tx.stockMovement.create({
      data: {
        materialId: params.materialId,
        type: params.type,
        quantity: params.quantity,
        unitCost: params.unitCost,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        stockEntryId: params.stockEntryId ?? undefined,
        writeOffId: params.writeOffId ?? undefined,
        serviceSaleId: params.serviceSaleId ?? undefined,
        movementDate: params.movementDate,
        note: params.note ?? undefined,
      },
    });
    if (params.type === 'IN' || params.type === 'OUT') {
      const [inAgg, outAgg] = await Promise.all([
        tx.stockMovement.aggregate({
          where: { materialId: params.materialId, type: 'IN', deletedAt: null },
          _sum: { quantity: true },
        }),
        tx.stockMovement.aggregate({
          where: { materialId: params.materialId, type: 'OUT', deletedAt: null },
          _sum: { quantity: true },
        }),
      ]);
      const qtyIn = Number((inAgg._sum.quantity ?? 0) as any);
      const qtyOut = Number((outAgg._sum.quantity ?? 0) as any);
      const totalQty = qtyIn - qtyOut;
      const valueIn = await this.getTotalValueIn(tx, params.materialId);
      const valueOut = await this.getTotalValueOut(tx, params.materialId);
      const totalValue = valueIn - valueOut;
      const newWac = totalQty > 0 ? totalValue / totalQty : 0;
      await tx.material.update({
        where: { id: params.materialId },
        data: { averageCost: new Decimal(newWac) },
      });
    }
  }

  private async getTotalValueIn(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    materialId: string,
  ): Promise<number> {
    const movements = await tx.stockMovement.findMany({
      where: { materialId, type: 'IN', deletedAt: null },
      select: { quantity: true, unitCost: true },
    });
    return movements.reduce((s, m) => s + Number(m.quantity) * Number(m.unitCost), 0);
  }

  private async getTotalValueOut(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    materialId: string,
  ): Promise<number> {
    const movements = await tx.stockMovement.findMany({
      where: { materialId, type: 'OUT', deletedAt: null },
      select: { quantity: true, unitCost: true },
    });
    return movements.reduce((s, m) => s + Number(m.quantity) * Number(m.unitCost), 0);
  }

  private async getBalanceForMaterial(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    materialId: string,
  ): Promise<number> {
    const [inAgg, outAgg] = await Promise.all([
      tx.stockMovement.aggregate({
        where: { materialId, type: 'IN', deletedAt: null },
        _sum: { quantity: true },
      }),
      tx.stockMovement.aggregate({
        where: { materialId, type: 'OUT', deletedAt: null },
        _sum: { quantity: true },
      }),
    ]);
    return Number(inAgg._sum.quantity ?? 0) - Number(outAgg._sum.quantity ?? 0);
  }

  /** Отмена списания по продаже: создаём IN-движения (возврат на склад) и помечаем исходные OUT удалёнными. */
  async reverseServiceSaleDeduction(serviceSaleId: string) {
    return this.prisma.$transaction(async (tx) => {
      const outMovements = await tx.stockMovement.findMany({
        where: { serviceSaleId, deletedAt: null, type: 'OUT' },
      });
      const now = new Date();
      for (const m of outMovements) {
        await this.recordMovementAndUpdateWac(tx, {
          materialId: m.materialId,
          type: StockMovementType.IN,
          quantity: m.quantity,
          unitCost: m.unitCost,
          sourceType: StockMovementSourceType.SERVICE_SALE,
          sourceId: serviceSaleId,
          serviceSaleId,
          movementDate: now,
          note: 'Возврат по отмене продажи услуги',
        });
        await tx.stockMovement.update({
          where: { id: m.id },
          data: { deletedAt: now },
        });
      }
    });
  }

  /** Отмена ручного списания: возврат материала на склад (IN), исходное OUT помечаем удалённым. */
  async reverseWriteOff(writeOffId: string) {
    return this.prisma.$transaction(async (tx) => {
      const outMovements = await tx.stockMovement.findMany({
        where: { writeOffId, deletedAt: null, type: 'OUT' },
      });
      const now = new Date();
      for (const m of outMovements) {
        await this.recordMovementAndUpdateWac(tx, {
          materialId: m.materialId,
          type: StockMovementType.IN,
          quantity: m.quantity,
          unitCost: m.unitCost,
          sourceType: StockMovementSourceType.WRITE_OFF,
          sourceId: writeOffId,
          writeOffId,
          movementDate: now,
          note: 'Возврат по отмене списания',
        });
        await tx.stockMovement.update({
          where: { id: m.id },
          data: { deletedAt: now },
        });
      }
    });
  }
}
