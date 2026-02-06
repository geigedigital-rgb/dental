import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementEngine } from './stock-movement.engine';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { CreateWriteOffDto } from './dto/create-write-off.dto';
import { UpdateWriteOffDto } from './dto/update-write-off.dto';
import { AuditService } from '../audit/audit.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementEngine: StockMovementEngine,
    private readonly audit: AuditService,
  ) {}

  async createEntry(dto: CreateStockEntryDto, userId?: string) {
    const entry = await this.movementEngine.registerGoodsReceipt({
      supplierId: dto.supplierId,
      entryDate: new Date(dto.entryDate),
      note: dto.note,
      deliveryCost: dto.deliveryCost != null ? new Decimal(dto.deliveryCost) : undefined,
      items: dto.items.map((i) => ({
        materialId: i.materialId,
        quantity: new Decimal(i.quantity),
        unitPrice: new Decimal(i.unitPrice),
        expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
      })),
    });
    if (entry) {
      const e = entry as any;
      const summary = `${e.supplier?.name ?? 'Поставщик'}, ${new Date(e.entryDate).toLocaleDateString('ru-RU')}, ${e.items?.length ?? 0} поз.`;
      await this.audit.log({
        userId: userId ?? undefined,
        action: 'CREATED',
        entityType: 'STOCK_ENTRY',
        entityId: entry.id,
        payload: JSON.stringify({
          recordSummary: summary,
          supplierId: e.supplierId,
          supplierName: e.supplier?.name,
          entryDate: e.entryDate,
          itemsCount: e.items?.length ?? 0,
        }),
      });
    }
    return entry;
  }

  async getEntries(params: { from?: Date; to?: Date; supplierId?: string }) {
    const where: any = { deletedAt: null };
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.from || params.to) {
      where.entryDate = {};
      if (params.from) where.entryDate.gte = params.from;
      if (params.to) where.entryDate.lte = params.to;
    }
    return this.prisma.stockEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      include: {
        supplier: true,
        items: { include: { material: true } },
      },
    });
  }

  async getEntryById(id: string) {
    const entry = await this.prisma.stockEntry.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        items: { include: { material: true } },
      },
    });
    if (!entry) throw new NotFoundException('Приходная накладная не найдена');
    return entry;
  }

  async updateEntry(id: string, dto: UpdateStockEntryDto, userId?: string) {
    await this.getEntryById(id);
    const data: { note?: string | null; entryDate?: Date; deliveryCost?: Decimal } = {};
    if (dto.note !== undefined) data.note = dto.note || null;
    if (dto.entryDate !== undefined) data.entryDate = new Date(dto.entryDate);
    if (dto.deliveryCost !== undefined) data.deliveryCost = new Decimal(dto.deliveryCost);
    const updated = await this.prisma.stockEntry.update({
      where: { id },
      data,
      include: { supplier: true, items: { include: { material: true } } },
    });
    const u = updated as any;
    await this.audit.log({
      userId: userId ?? undefined,
      action: 'UPDATED',
      entityType: 'STOCK_ENTRY',
      entityId: id,
      payload: JSON.stringify({
        recordSummary: `${u.supplier?.name ?? 'Поставщик'}, ${new Date(u.entryDate).toLocaleDateString('ru-RU')}`,
        changes: dto,
      }),
    });
    return updated;
  }

  async deleteEntry(id: string, userId?: string) {
    const entry = await this.getEntryById(id);
    const e = entry as any;
    const now = new Date();
    await this.prisma.stockEntryItem.updateMany({
      where: { stockEntryId: id },
      data: { deletedAt: now },
    });
    await this.prisma.stockEntry.update({
      where: { id },
      data: { deletedAt: now },
    });
    await this.audit.log({
      userId: userId ?? undefined,
      action: 'DELETED',
      entityType: 'STOCK_ENTRY',
      entityId: id,
      payload: JSON.stringify({
        recordSummary: `${e.supplier?.name ?? 'Поставщик'}, ${new Date(e.entryDate).toLocaleDateString('ru-RU')}`,
        supplierId: entry.supplierId,
        entryDate: entry.entryDate,
      }),
    });
    return { ok: true };
  }

  async createWriteOff(dto: CreateWriteOffDto, userId?: string) {
    const writeOff = await this.movementEngine.registerWriteOff({
      materialId: dto.materialId,
      materialLotId: dto.materialLotId,
      quantity: new Decimal(dto.quantity),
      reason: dto.reason,
      writeOffDate: new Date(dto.writeOffDate),
    });
    if (writeOff) {
      const w = writeOff as any;
      const summary = `${w.material?.name ?? 'Материал'}, ${Number(w.quantity)} ${w.material?.unit ?? 'шт'}, ${new Date(w.writeOffDate).toLocaleDateString('ru-RU')}`;
      await this.audit.log({
        userId: userId ?? undefined,
        action: 'CREATED',
        entityType: 'WRITE_OFF',
        entityId: writeOff.id,
        payload: JSON.stringify({
          recordSummary: summary,
          materialId: w.materialId,
          materialName: w.material?.name,
          quantity: Number(w.quantity),
          reason: w.reason,
          writeOffDate: w.writeOffDate,
        }),
      });
    }
    return writeOff;
  }

  async getWriteOffById(id: string) {
    const w = await this.prisma.writeOff.findFirst({
      where: { id, deletedAt: null },
      include: { material: true, materialLot: true },
    });
    if (!w) throw new NotFoundException('Списание не найдено');
    return w;
  }

  async getWriteOffs(params: { from?: Date; to?: Date; materialId?: string }) {
    const where: any = { deletedAt: null };
    if (params.materialId) where.materialId = params.materialId;
    if (params.from || params.to) {
      where.writeOffDate = {};
      if (params.from) where.writeOffDate.gte = params.from;
      if (params.to) where.writeOffDate.lte = params.to;
    }
    return this.prisma.writeOff.findMany({
      where,
      orderBy: { writeOffDate: 'desc' },
      include: { material: true },
    });
  }

  async updateWriteOff(id: string, dto: UpdateWriteOffDto, userId?: string) {
    const prev = await this.getWriteOffById(id);
    const data: { reason?: string; writeOffDate?: Date } = {};
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.writeOffDate !== undefined) data.writeOffDate = new Date(dto.writeOffDate);
    const updated = await this.prisma.writeOff.update({
      where: { id },
      data,
      include: { material: true },
    });
    const u = updated as any;
    await this.audit.log({
      userId: userId ?? undefined,
      action: 'UPDATED',
      entityType: 'WRITE_OFF',
      entityId: id,
      payload: JSON.stringify({
        recordSummary: `${u.material?.name ?? 'Материал'}, ${Number(u.quantity)} ${u.material?.unit ?? 'шт'}`,
        changes: dto,
      }),
    });
    return updated;
  }

  async deleteWriteOff(id: string, userId?: string) {
    const w = await this.getWriteOffById(id);
    const ww = w as any;
    await this.movementEngine.reverseWriteOff(id);
    const now = new Date();
    await this.prisma.writeOff.update({
      where: { id },
      data: { deletedAt: now },
    });
    await this.audit.log({
      userId: userId ?? undefined,
      action: 'DELETED',
      entityType: 'WRITE_OFF',
      entityId: id,
      payload: JSON.stringify({
        recordSummary: `${ww.material?.name ?? 'Материал'}, ${Number(ww.quantity)} ${ww.material?.unit ?? 'шт'}, ${ww.reason}`,
        materialId: w.materialId,
        quantity: Number(w.quantity),
        reason: w.reason,
      }),
    });
    return { ok: true };
  }

  async getMovements(params: {
    materialId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const where: any = { deletedAt: null };
    if (params.materialId) where.materialId = params.materialId;
    if (params.from || params.to) {
      where.movementDate = {};
      if (params.from) where.movementDate.gte = params.from;
      if (params.to) where.movementDate.lte = params.to;
    }
    return this.prisma.stockMovement.findMany({
      where,
      orderBy: { movementDate: 'desc' },
      take: params.limit ?? 100,
      include: {
        material: true,
        stockEntry: { include: { supplier: true } },
      },
    });
  }

  /**
   * Партии одного материала (для выбора при ручном списании).
   */
  async getLotsByMaterial(materialId: string) {
    const lots = await this.prisma.materialLot.findMany({
      where: { materialId, quantity: { gt: 0 } },
      orderBy: [{ receivedAt: 'desc' }],
      include: {
        stockEntryItem: {
          include: {
            stockEntry: { include: { supplier: true } },
          },
        },
      },
    });
    return lots.map((lot) => ({
      id: lot.id,
      quantity: Number(lot.quantity),
      unitCost: Number(lot.unitCost),
      receivedAt: lot.receivedAt,
      expiryDate: lot.expiryDate,
      supplierName: (lot.stockEntryItem as any)?.stockEntry?.supplier?.name ?? '—',
    }));
  }

  /**
   * Остатки по материалам с разбивкой по партиям: поставщик, кол-во, дата прихода, срок годности.
   * Для одного таба «Цепочка» на фронте.
   */
  async getInventoryWithLots() {
    const materials = await this.prisma.material.findMany({
      where: { deletedAt: null, isArchived: false },
      include: { materialType: true },
    });
    const movementSums = await this.prisma.stockMovement.groupBy({
      by: ['materialId', 'type'],
      where: { deletedAt: null },
      _sum: { quantity: true },
    });
    const balanceByMaterial = new Map<string, number>();
    for (const row of movementSums) {
      const current = balanceByMaterial.get(row.materialId) ?? 0;
      const q = Number(row._sum.quantity ?? 0);
      balanceByMaterial.set(row.materialId, row.type === 'IN' ? current + q : current - q);
    }

    const lots = await this.prisma.materialLot.findMany({
      where: { quantity: { gt: 0 } },
      include: {
        stockEntryItem: {
          include: {
            stockEntry: { include: { supplier: true } },
          },
        },
      },
    });

    const lotsByMaterial = new Map<string, any[]>();
    for (const lot of lots) {
      const supplierName = (lot.stockEntryItem as any)?.stockEntry?.supplier?.name ?? '—';
      const list = lotsByMaterial.get(lot.materialId) ?? [];
      list.push({
        id: lot.id,
        quantity: Number(lot.quantity),
        unitCost: Number(lot.unitCost),
        receivedAt: lot.receivedAt,
        expiryDate: lot.expiryDate,
        supplierName,
      });
      lotsByMaterial.set(lot.materialId, list);
    }

    return materials
      .map((m) => {
        const balance = balanceByMaterial.get(m.id) ?? 0;
        const materialLots = lotsByMaterial.get(m.id) ?? [];
        return {
          id: m.id,
          name: m.name,
          unit: m.unit ?? 'шт',
          category: (m.materialType?.name ?? '').split(' ')[0] || '—',
          currentQuantity: balance,
          averageCost: Number(m.averageCost ?? 0),
          minStockThreshold: Number(m.minStockThreshold ?? 0),
          lots: materialLots.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
        };
      })
      .filter((m) => m.currentQuantity > 0);
  }
}
