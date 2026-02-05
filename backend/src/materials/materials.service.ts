import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialDto) {
    const ratio = dto.purchaseUnitRatio != null && dto.purchaseUnitRatio >= 0.0001 ? new Decimal(dto.purchaseUnitRatio) : new Decimal(1);
    const data = {
      materialTypeId: dto.materialTypeId,
      name: dto.name,
      unit: dto.unit,
      purchaseUnit: dto.purchaseUnit ?? null,
      purchaseUnitRatio: ratio,
      country: dto.country ?? null,
      description: dto.description ?? null,
      minStockThreshold: dto.minStockThreshold != null ? new Decimal(dto.minStockThreshold) : new Decimal(0),
      isArchived: dto.isArchived ?? false,
    };
    return this.prisma.material.create({
      data,
      include: { materialType: true },
    });
  }

  async findAll(options: { includeArchived?: boolean; materialTypeId?: string; search?: string } = {}) {
    const where: any = { deletedAt: null };
    if (!options.includeArchived) where.isArchived = false;
    if (options.materialTypeId) where.materialTypeId = options.materialTypeId;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { materialType: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    const list = await this.prisma.material.findMany({
      where,
      orderBy: [{ materialType: { sortOrder: 'asc' } }, { materialType: { name: 'asc' } }, { name: 'asc' }],
      include: { materialType: true },
    });
    const withBalance = await Promise.all(
      list.map(async (m) => {
        const balance = await this.getBalance(m.id);
        return { ...m, currentQuantity: balance };
      }),
    );
    return withBalance;
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, deletedAt: null },
      include: { materialType: true },
    });
    if (!material) throw new NotFoundException('Материал не найден');
    const balance = await this.getBalance(id);
    return { ...material, currentQuantity: balance };
  }

  async update(id: string, dto: UpdateMaterialDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.materialTypeId !== undefined) data.materialTypeId = dto.materialTypeId;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.purchaseUnit !== undefined) data.purchaseUnit = dto.purchaseUnit;
    if (dto.purchaseUnitRatio !== undefined) data.purchaseUnitRatio = new Decimal(dto.purchaseUnitRatio);
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.minStockThreshold !== undefined) data.minStockThreshold = new Decimal(dto.minStockThreshold);
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;
    return this.prisma.material.update({
      where: { id },
      data,
      include: { materialType: true },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.material.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getBalance(materialId: string): Promise<number> {
    const [inAgg, outAgg] = await Promise.all([
      this.prisma.stockMovement.aggregate({
        where: { materialId, type: 'IN', deletedAt: null },
        _sum: { quantity: true },
      }),
      this.prisma.stockMovement.aggregate({
        where: { materialId, type: 'OUT', deletedAt: null },
        _sum: { quantity: true },
      }),
    ]);
    const inQ = Number(inAgg._sum.quantity ?? 0);
    const outQ = Number(outAgg._sum.quantity ?? 0);
    return inQ - outQ;
  }
}
