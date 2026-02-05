import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementEngine } from '../stock/stock-movement.engine';
import { MaterialsService } from '../materials/materials.service';
import { ServicesService } from '../services/services.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface SaleFinancialResult {
  totalPrice: number;
  laborAmount: number;
  materialCostTotal: number;
  materialSaleAmountTotal: number;
  grossMargin: number;
  marginPercent: number;
  materialMargins: { materialId: string; cost: number; assignedAmount: number; margin: number }[];
}

/** Один пункт состава: материал, кол-во (на одну услугу), назначенная сумма (грн). Доп. материалы разрешены. */
export interface MaterialLine {
  materialId: string;
  quantity: number;
  amount: number;
}

@Injectable()
export class FinancialEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementEngine: StockMovementEngine,
    private readonly materialsService: MaterialsService,
    private readonly servicesService: ServicesService,
  ) {}

  /**
   * Регистрация продажи услуги.
   * materialAmounts: материал, quantity (на одну услугу для списания), amount (назначенная сумма в распределении).
   * Разрешены доп. материалы, не входящие в состав услуги. Сумма: laborAmount + sum(amounts) не должна превышать totalPrice
   * (если меньше — допускается, в отчёте будет минус). Остатки на складе проверяются перед списанием.
   */
  async registerServiceSale(params: {
    serviceId: string;
    saleDate: Date;
    totalPrice: number;
    laborAmount: number;
    materialAmounts: MaterialLine[];
    note?: string;
    createdById?: string;
  }): Promise<{ sale: any; financial: SaleFinancialResult }> {
    const service = await this.prisma.service.findFirst({
      where: { id: params.serviceId, deletedAt: null },
    });
    if (!service) throw new BadRequestException('Услуга не найдена');

    const lines = params.materialAmounts.filter((m) => m.materialId && (m.quantity > 0 || m.amount > 0));
    if (!lines.length) throw new BadRequestException('Укажите хотя бы один материал с количеством или суммой');

    const materialAmountsSum = lines.reduce((s, m) => s + m.amount, 0);
    const totalFromForm = params.laborAmount + materialAmountsSum;
    if (totalFromForm > params.totalPrice + 0.01) {
      throw new BadRequestException(
        `Сумма распределения (${totalFromForm.toFixed(2)}) не может превышать общую сумму (${params.totalPrice})`,
      );
    }

    const materialIds = [...new Set(lines.map((m) => m.materialId))];
    const materials = await this.prisma.material.findMany({
      where: { id: { in: materialIds }, deletedAt: null },
    });
    const wacByMaterial = new Map(materials.map((m) => [m.id, Number(m.averageCost ?? 0)]));

    const composition: { materialId: string; quantity: number; unitCost: number; totalCost: number; amount: number }[] = [];
    for (const line of lines) {
      const unitCost = wacByMaterial.get(line.materialId) ?? 0;
      const qty = Math.max(0, line.quantity);
      const totalCost = qty * unitCost;
      composition.push({
        materialId: line.materialId,
        quantity: qty,
        unitCost,
        totalCost,
        amount: line.amount,
      });
    }

    for (const c of composition) {
      if (c.quantity > 0) {
        const balance = await this.materialsService.getBalance(c.materialId);
        if (balance < c.quantity) {
          const material = materials.find((m) => m.id === c.materialId);
          throw new BadRequestException(
            `Недостаточно на складе: ${material?.name ?? c.materialId}. Нужно: ${c.quantity}, остаток: ${balance.toFixed(4)}`,
          );
        }
      }
    }

    const materialCostTotal = composition.reduce((s, c) => s + c.totalCost, 0);
    const grossMargin = params.totalPrice - materialCostTotal;
    const marginPercent = params.totalPrice > 0 ? (grossMargin / params.totalPrice) * 100 : 0;

    const sale = await this.prisma.$transaction(async (tx) => {
      const newSale = await tx.serviceSale.create({
        data: {
          serviceId: params.serviceId,
          saleDate: params.saleDate,
          salePrice: new Decimal(params.totalPrice),
          laborAmount: new Decimal(params.laborAmount),
          materialCostTotal: new Decimal(materialCostTotal),
          grossMargin: new Decimal(grossMargin),
          marginPercent: new Decimal(marginPercent),
          note: params.note ?? null,
          createdById: params.createdById ?? null,
        },
      });
      for (const c of composition) {
        await tx.serviceSaleMaterialSnapshot.create({
          data: {
            serviceSaleId: newSale.id,
            materialId: c.materialId,
            quantity: new Decimal(c.quantity),
            unitCostSnapshot: new Decimal(c.unitCost),
            totalCost: new Decimal(c.totalCost),
            assignedSaleAmount: new Decimal(c.amount),
          },
        });
      }
      return newSale;
    });

    const itemsToDeduct = composition.filter((c) => c.quantity > 0).map((c) => ({
      materialId: c.materialId,
      quantity: new Decimal(c.quantity),
      unitCost: new Decimal(c.unitCost),
    }));
    if (itemsToDeduct.length) {
      await this.movementEngine.registerServiceSaleDeduction({
        serviceSaleId: sale.id,
        items: itemsToDeduct,
        movementDate: params.saleDate,
      });
    }

    const fullSale = await this.prisma.serviceSale.findUnique({
      where: { id: sale.id },
      include: { service: true, materialSnapshots: { include: { material: true } } },
    });

    const materialMargins = composition.map((c) => ({
      materialId: c.materialId,
      cost: c.totalCost,
      assignedAmount: c.amount,
      margin: c.amount - c.totalCost,
    }));

    return {
      sale: fullSale,
      financial: {
        totalPrice: params.totalPrice,
        laborAmount: params.laborAmount,
        materialCostTotal,
        materialSaleAmountTotal: materialAmountsSum,
        grossMargin,
        marginPercent,
        materialMargins,
      },
    };
  }

  async getBreakEvenPrice(serviceId: string): Promise<number> {
    return this.servicesService.calculateCurrentCost(serviceId);
  }
}
