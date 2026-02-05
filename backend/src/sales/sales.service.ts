import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialEngine } from './financial.engine';
import { CreateServiceSaleDto } from './dto/create-service-sale.dto';
import { UpdateServiceSaleDto } from './dto/update-service-sale.dto';
import { AuditService } from '../audit/audit.service';
import { StockMovementEngine } from '../stock/stock-movement.engine';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialEngine: FinancialEngine,
    private readonly audit: AuditService,
    private readonly movementEngine: StockMovementEngine,
  ) {}

  async registerServiceSale(dto: CreateServiceSaleDto, userId?: string) {
    const result = await this.financialEngine.registerServiceSale({
      serviceId: dto.serviceId,
      saleDate: new Date(dto.saleDate),
      totalPrice: dto.totalPrice,
      laborAmount: dto.laborAmount,
      materialAmounts: dto.materialAmounts.map((m) => ({
        materialId: m.materialId,
        quantity: m.quantity ?? 0,
        amount: m.amount,
      })),
      note: dto.note,
    });
    const sale = result.sale as any;
    await this.audit.log({
      userId: userId ?? undefined,
      action: 'CREATED',
      entityType: 'SERVICE_SALE',
      entityId: result.sale.id,
      payload: JSON.stringify({
        recordSummary: `${sale.service?.name ?? 'Услуга'}, ${Number(sale.salePrice ?? 0).toFixed(2)} грн, ${new Date(sale.saleDate).toLocaleDateString('ru-RU')}`,
        serviceId: sale.serviceId,
        serviceName: sale.service?.name,
        saleDate: sale.saleDate,
        salePrice: Number(sale.salePrice),
        laborAmount: Number(sale.laborAmount),
      }),
    });
    return result;
  }

  async getServiceSales(params: { from?: Date; to?: Date; serviceId?: string }) {
    const where: any = { deletedAt: null };
    if (params.serviceId) where.serviceId = params.serviceId;
    if (params.from || params.to) {
      where.saleDate = {};
      if (params.from) where.saleDate.gte = params.from;
      if (params.to) where.saleDate.lte = params.to;
    }
    return this.prisma.serviceSale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      include: { service: true },
    });
  }

  async getServiceSaleById(id: string) {
    const sale = await this.prisma.serviceSale.findFirst({
      where: { id, deletedAt: null },
      include: {
        service: true,
        materialSnapshots: { include: { material: true } },
      },
    });
    if (!sale) throw new NotFoundException('Продажа не найдена');
    return sale;
  }

  async updateServiceSale(id: string, dto: UpdateServiceSaleDto, userId?: string) {
    const sale = await this.getServiceSaleById(id);
    const data: {
      note?: string | null;
      saleDate?: Date;
      salePrice?: Decimal;
      laborAmount?: Decimal;
      grossMargin?: Decimal;
      marginPercent?: Decimal;
    } = {};
    if (dto.note !== undefined) data.note = dto.note == null || dto.note === '' ? null : String(dto.note).trim();
    if (dto.saleDate !== undefined) data.saleDate = new Date(dto.saleDate);
    const totalPriceVal = dto.totalPrice !== undefined ? Number(dto.totalPrice) : undefined;
    const laborAmountVal = dto.laborAmount !== undefined ? Number(dto.laborAmount) : undefined;
    if (totalPriceVal !== undefined && !Number.isNaN(totalPriceVal)) data.salePrice = new Decimal(totalPriceVal);
    if (laborAmountVal !== undefined && !Number.isNaN(laborAmountVal)) data.laborAmount = new Decimal(laborAmountVal);
    // При изменении суммы пересчитываем маржу (materialCostTotal не меняется при редактировании)
    if (totalPriceVal !== undefined && !Number.isNaN(totalPriceVal)) {
      const materialCostTotalNum = Number((sale as any).materialCostTotal ?? 0);
      const grossMarginNum = Math.max(0, totalPriceVal - materialCostTotalNum);
      const marginPercentNum = totalPriceVal > 0 ? (grossMarginNum / totalPriceVal) * 100 : 0;
      data.grossMargin = new Decimal(grossMarginNum);
      data.marginPercent = new Decimal(marginPercentNum);
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нет данных для обновления (укажите totalPrice, laborAmount, note или saleDate)');
    }
    const updated = await this.prisma.serviceSale.update({
      where: { id },
      data,
      include: { service: true, materialSnapshots: { include: { material: true } } },
    });
    const s = updated as any;
    await this.audit.log({
      userId: userId ?? undefined,
      action: 'UPDATED',
      entityType: 'SERVICE_SALE',
      entityId: id,
      payload: JSON.stringify({
        recordSummary: `${s.service?.name ?? 'Услуга'}, ${Number(s.salePrice ?? 0).toFixed(2)} грн`,
        changes: data,
      }),
    });
    return updated;
  }

  async deleteServiceSale(id: string, userId?: string) {
    const sale = await this.getServiceSaleById(id);
    const s = sale as any;
    await this.movementEngine.reverseServiceSaleDeduction(id);
    const now = new Date();
    await this.prisma.serviceSaleMaterialSnapshot.updateMany({
      where: { serviceSaleId: id },
      data: { deletedAt: now },
    });
    await this.prisma.serviceSale.update({
      where: { id },
      data: { deletedAt: now },
    });
    await this.audit.log({
      userId: userId ?? undefined,
      action: 'DELETED',
      entityType: 'SERVICE_SALE',
      entityId: id,
      payload: JSON.stringify({
        recordSummary: `${s.service?.name ?? 'Услуга'}, ${Number(s.salePrice ?? 0).toFixed(2)} грн, ${new Date(s.saleDate).toLocaleDateString('ru-RU')}`,
        serviceId: sale.serviceId,
        saleDate: sale.saleDate,
        salePrice: Number(sale.salePrice),
      }),
    });
    return { ok: true };
  }
}
