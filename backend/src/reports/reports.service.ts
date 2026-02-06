import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async profitByPeriod(from: Date, to: Date) {
    const sales = await this.prisma.serviceSale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: from, lte: to },
      },
      select: {
        salePrice: true,
        laborAmount: true,
        materialCostTotal: true,
        grossMargin: true,
        saleDate: true,
        serviceId: true,
      },
    });
    const totalRevenue = sales.reduce((s, x) => s + Number(x.salePrice), 0);
    const totalMaterialCost = sales.reduce((s, x) => s + Number(x.materialCostTotal), 0);
    const totalGrossMargin = sales.reduce((s, x) => s + Number(x.grossMargin), 0);
    const totalLaborAmount = sales.reduce((s, x) => s + Number(x.laborAmount ?? 0), 0);
    const totalMaterialMargin = totalGrossMargin - totalLaborAmount;

    const entries = await this.prisma.stockEntry.findMany({
      where: {
        deletedAt: null,
        entryDate: { gte: from, lte: to },
      },
      include: { items: true },
    });
    let totalPurchaseCost = 0;
    let totalDeliveryCost = 0;
    for (const e of entries) {
      totalDeliveryCost += Number(e.deliveryCost ?? 0);
      for (const it of e.items) {
        totalPurchaseCost += Number(it.quantity) * Number(it.unitPrice);
      }
    }

    return {
      from,
      to,
      totalRevenue,
      totalMaterialCost,
      totalGrossMargin,
      totalLaborAmount,
      totalMaterialMargin,
      totalPurchaseCost,
      totalDeliveryCost,
      totalPurchaseExpenses: totalPurchaseCost + totalDeliveryCost,
      saleCount: sales.length,
    };
  }

  async materialConsumption(from: Date, to: Date) {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        deletedAt: null,
        type: 'OUT',
        movementDate: { gte: from, lte: to },
      },
      include: { material: true },
    });
    const byMaterial = new Map<
      string,
      { materialId: string; materialName: string; quantity: number; cost: number }
    >();
    for (const m of movements) {
      const q = Number(m.quantity);
      const c = Number(m.unitCost);
      const key = m.materialId;
      if (!byMaterial.has(key)) {
        byMaterial.set(key, {
          materialId: m.materialId,
          materialName: (m.material as any).name,
          quantity: 0,
          cost: 0,
        });
      }
      const rec = byMaterial.get(key)!;
      rec.quantity += q;
      rec.cost += q * c;
    }
    return Array.from(byMaterial.values());
  }

  async serviceProfitability(from: Date, to: Date) {
    const sales = await this.prisma.serviceSale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: from, lte: to },
      },
      include: { service: true },
    });
    const byService = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        saleCount: number;
        totalRevenue: number;
        totalMaterialCost: number;
        totalMargin: number;
        avgMarginPercent: number;
      }
    >();
    for (const s of sales) {
      const key = s.serviceId;
      if (!byService.has(key)) {
        byService.set(key, {
          serviceId: s.serviceId,
          serviceName: (s.service as any).name,
          saleCount: 0,
          totalRevenue: 0,
          totalMaterialCost: 0,
          totalMargin: 0,
          avgMarginPercent: 0,
        });
      }
      const rec = byService.get(key)!;
      rec.saleCount += 1;
      rec.totalRevenue += Number(s.salePrice);
      rec.totalMaterialCost += Number(s.materialCostTotal);
      rec.totalMargin += Number(s.grossMargin);
    }
    for (const rec of byService.values()) {
      rec.avgMarginPercent =
        rec.totalRevenue > 0 ? (rec.totalMargin / rec.totalRevenue) * 100 : 0;
    }
    return Array.from(byService.values());
  }

  async inventoryBalance() {
    const materials = await this.prisma.material.findMany({
      where: { deletedAt: null, isArchived: false },
      select: { id: true, name: true, unit: true, averageCost: true, materialType: { select: { name: true } } },
    });
    const balances = await Promise.all(
      materials.map(async (m) => {
        const [inAgg, outAgg] = await Promise.all([
          this.prisma.stockMovement.aggregate({
            where: { materialId: m.id, type: 'IN', deletedAt: null },
            _sum: { quantity: true },
          }),
          this.prisma.stockMovement.aggregate({
            where: { materialId: m.id, type: 'OUT', deletedAt: null },
            _sum: { quantity: true },
          }),
        ]);
        const qty = Number(inAgg._sum.quantity ?? 0) - Number(outAgg._sum.quantity ?? 0);
        const value = qty * Number(m.averageCost);
        return {
          ...m,
          category: m.materialType?.name ?? '',
          quantity: qty,
          totalValue: value,
        };
      }),
    );
    return balances.filter((b) => b.quantity > 0);
  }

  async lowStockAlerts() {
    const materials = await this.prisma.material.findMany({
      where: { deletedAt: null, isArchived: false },
      include: { materialType: true },
    });
    const result = [];
    for (const m of materials) {
      const [inAgg, outAgg] = await Promise.all([
        this.prisma.stockMovement.aggregate({
          where: { materialId: m.id, type: 'IN', deletedAt: null },
          _sum: { quantity: true },
        }),
        this.prisma.stockMovement.aggregate({
          where: { materialId: m.id, type: 'OUT', deletedAt: null },
          _sum: { quantity: true },
        }),
      ]);
      const qty = Number(inAgg._sum.quantity ?? 0) - Number(outAgg._sum.quantity ?? 0);
      const threshold = Number(m.minStockThreshold ?? 0);
      if (threshold > 0 && qty <= threshold) {
        result.push({
          materialId: m.id,
          materialName: m.name,
          category: m.materialType?.name ?? '',
          currentQuantity: qty,
          minThreshold: threshold,
        });
      }
    }
    return result;
  }

  /** Сводка для дашборда: стоимость склада, кол-во позиций, критические остатки */
  async warehouseDashboard() {
    const materials = await this.prisma.material.findMany({
      where: { deletedAt: null, isArchived: false },
      select: {
        id: true,
        name: true,
        unit: true,
        averageCost: true,
        minStockThreshold: true,
        materialType: { select: { name: true } },
      },
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

    let totalStockValue = 0;
    let positionsInStock = 0;
    const lowStockAlerts: Array<{
      materialId: string;
      materialName: string;
      category: string;
      unit: string;
      currentQuantity: number;
      minThreshold: number;
      shortage: number;
      averageCost: number;
      estimatedCostToRestock: number;
      isZero: boolean;
    }> = [];

    for (const m of materials) {
      const qty = balanceByMaterial.get(m.id) ?? 0;
      const avgCost = Number(m.averageCost);
      const value = qty * avgCost;
      totalStockValue += value;
      if (qty > 0) positionsInStock += 1;

      const threshold = Number(m.minStockThreshold ?? 0);
      const isBelowThreshold = threshold > 0 && qty <= threshold;
      const isZero = qty === 0;
      if (isBelowThreshold || isZero) {
        const shortage = threshold > 0 ? Math.max(0, threshold - qty) : (isZero ? 0 : 0);
        const estimatedCostToRestock = shortage * avgCost;
        lowStockAlerts.push({
          materialId: m.id,
          materialName: m.name,
          category: m.materialType?.name ?? '',
          unit: m.unit ?? 'шт',
          currentQuantity: qty,
          minThreshold: threshold,
          shortage,
          averageCost: avgCost,
          estimatedCostToRestock,
          isZero,
        });
      }
    }

    const positionsTotal = materials.length;
    const positionsOutOfStock = positionsTotal - positionsInStock;

    return {
      totalStockValue,
      positionsTotal,
      positionsInStock,
      positionsOutOfStock,
      lowStockAlerts: lowStockAlerts.sort((a, b) => a.currentQuantity - b.currentQuantity),
    };
  }

  async marginAnalysis(from: Date, to: Date) {
    const sales = await this.prisma.serviceSale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: from, lte: to },
      },
    });
    const totalRevenue = sales.reduce((s, x) => s + Number(x.salePrice), 0);
    const totalMaterialCost = sales.reduce((s, x) => s + Number(x.materialCostTotal), 0);
    const totalMargin = sales.reduce((s, x) => s + Number(x.grossMargin), 0);
    const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    return {
      from,
      to,
      totalRevenue,
      totalMaterialCost,
      totalMargin,
      avgMarginPercent,
      saleCount: sales.length,
    };
  }

  /** Денежный поток: поступления (выручка) и выплаты (закупки + доставка) по периодам */
  async cashflow(
    from: Date,
    to: Date,
    groupBy: 'day' | 'week' | 'month',
  ) {
    const sales = await this.prisma.serviceSale.findMany({
      where: { deletedAt: null, saleDate: { gte: from, lte: to } },
      select: { saleDate: true, salePrice: true },
    });
    const entries = await this.prisma.stockEntry.findMany({
      where: { deletedAt: null, entryDate: { gte: from, lte: to } },
      include: { items: true },
    });

    const key = (d: Date) => {
      const x = new Date(d);
      if (groupBy === 'day') return x.toISOString().slice(0, 10);
      if (groupBy === 'week') {
        const start = new Date(x); start.setDate(x.getDate() - x.getDay());
        return start.toISOString().slice(0, 10);
      }
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
    };

    const periods = new Map<string, { inflows: number; outflows: number }>();

    for (const s of sales) {
      const k = key(s.saleDate);
      if (!periods.has(k)) periods.set(k, { inflows: 0, outflows: 0 });
      periods.get(k)!.inflows += Number(s.salePrice);
    }
    for (const e of entries) {
      const k = key(e.entryDate);
      if (!periods.has(k)) periods.set(k, { inflows: 0, outflows: 0 });
      let out = Number(e.deliveryCost ?? 0);
      for (const it of e.items) out += Number(it.quantity) * Number(it.unitPrice);
      periods.get(k)!.outflows += out;
    }

    const sortedKeys = Array.from(periods.keys()).sort();
    const series = sortedKeys.map((k) => ({
      period: k,
      label: k,
      inflows: periods.get(k)!.inflows,
      outflows: periods.get(k)!.outflows,
      balance: periods.get(k)!.inflows - periods.get(k)!.outflows,
    }));

    const totalInflows = series.reduce((s, x) => s + x.inflows, 0);
    const totalOutflows = series.reduce((s, x) => s + x.outflows, 0);

    return {
      from,
      to,
      groupBy,
      series,
      summary: { totalInflows, totalOutflows, netCashflow: totalInflows - totalOutflows },
    };
  }

  /** P&L (Profit & Loss): выручка, себестоимость, валовая прибыль, операционные расходы, чистая прибыль */
  async pl(from: Date, to: Date) {
    const sales = await this.prisma.serviceSale.findMany({
      where: { deletedAt: null, saleDate: { gte: from, lte: to } },
      select: { salePrice: true, materialCostTotal: true, grossMargin: true, laborAmount: true },
    });
    const entries = await this.prisma.stockEntry.findMany({
      where: { deletedAt: null, entryDate: { gte: from, lte: to } },
      select: { deliveryCost: true },
    });

    const revenue = sales.reduce((s, x) => s + Number(x.salePrice), 0);
    const cogs = sales.reduce((s, x) => s + Number(x.materialCostTotal), 0);
    const grossProfit = sales.reduce((s, x) => s + Number(x.grossMargin), 0);
    const operatingExpenses = entries.reduce((s, x) => s + Number(x.deliveryCost ?? 0), 0);
    const netProfit = grossProfit - operatingExpenses;

    return {
      from,
      to,
      revenue,
      cogs,
      grossProfit,
      grossMarginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      operatingExpenses,
      netProfit,
      netMarginPercent: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      saleCount: sales.length,
    };
  }

  /** Данные для графиков: выручка и маржа по дням за период */
  async revenueMarginDaily(from: Date, to: Date) {
    const sales = await this.prisma.serviceSale.findMany({
      where: { deletedAt: null, saleDate: { gte: from, lte: to } },
      select: { saleDate: true, salePrice: true, grossMargin: true },
    });
    const byDay = new Map<string, { revenue: number; margin: number }>();
    for (const s of sales) {
      const k = new Date(s.saleDate).toISOString().slice(0, 10);
      if (!byDay.has(k)) byDay.set(k, { revenue: 0, margin: 0 });
      byDay.get(k)!.revenue += Number(s.salePrice);
      byDay.get(k)!.margin += Number(s.grossMargin);
    }
    return Array.from(byDay.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async operationLog(params: {
    from?: Date;
    to?: Date;
    limit?: number;
    entityType?: string;
    entityId?: string;
  }) {
    const where: any = {};
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
      include: { user: { select: { fullName: true, email: true } } },
    });
  }
}
