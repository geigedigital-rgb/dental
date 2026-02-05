import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          basePrice: dto.basePrice != null ? new Decimal(dto.basePrice) : new Decimal(0),
        },
      });
      for (const m of dto.materials) {
        await tx.serviceMaterial.create({
          data: {
            serviceId: service.id,
            materialId: m.materialId,
            quantity: new Decimal(m.quantity),
          },
        });
      }
      return tx.service.findUnique({
        where: { id: service.id },
        include: { materials: { include: { material: true } } },
      });
    });
  }

  async findAll() {
    const list = await this.prisma.service.findMany({
      where: { deletedAt: null },
      include: { materials: { include: { material: true } } },
      orderBy: { name: 'asc' },
    });
    const withCost = await Promise.all(
      list.map(async (s) => {
        const cost = await this.calculateCurrentCost(s.id);
        return { ...s, currentMaterialCost: cost };
      }),
    );
    return withCost;
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: { materials: { include: { material: true } } },
    });
    if (!service) throw new NotFoundException('Услуга не найдена');
    const cost = await this.calculateCurrentCost(id);
    const breakEven = cost;
    return { ...service, currentMaterialCost: cost, breakEvenPrice: breakEven };
  }

  async getCurrentCostAndBreakEven(serviceId: string) {
    const cost = await this.calculateCurrentCost(serviceId);
    return {
      currentMaterialCost: cost,
      breakEvenPrice: cost,
      minViablePrice: cost,
    };
  }

  async calculateCurrentCost(serviceId: string): Promise<number> {
    const composition = await this.prisma.serviceMaterial.findMany({
      where: { serviceId, deletedAt: null },
      include: { material: true },
    });
    let total = 0;
    for (const sm of composition) {
      const qty = Number(sm.quantity);
      const wac = Number((sm.material as any).averageCost ?? 0);
      total += qty * wac;
    }
    return total;
  }

  async update(id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
    });
    if (!service) throw new NotFoundException('Услуга не найдена');
    return this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.basePrice !== undefined) data.basePrice = new Decimal(dto.basePrice);
      if (Object.keys(data).length) await tx.service.update({ where: { id }, data });
      if (dto.materials !== undefined) {
        await tx.serviceMaterial.updateMany({
          where: { serviceId: id },
          data: { deletedAt: new Date() },
        });
        for (const m of dto.materials) {
          await tx.serviceMaterial.upsert({
            where: {
              serviceId_materialId: { serviceId: id, materialId: m.materialId },
            },
            create: {
              serviceId: id,
              materialId: m.materialId,
              quantity: new Decimal(m.quantity),
            },
            update: { quantity: new Decimal(m.quantity), deletedAt: null },
          });
        }
      }
      return tx.service.findUnique({
        where: { id },
        include: { materials: { include: { material: true } } },
      });
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getCompositionWithCosts(serviceId: string): Promise<
    { materialId: string; materialName: string; quantity: number; unitCost: number; totalCost: number }[]
  > {
    const composition = await this.prisma.serviceMaterial.findMany({
      where: { serviceId, deletedAt: null },
      include: { material: true },
    });
    return composition.map((sm) => {
      const qty = Number(sm.quantity);
      const wac = Number((sm.material as any).averageCost ?? 0);
      return {
        materialId: sm.materialId,
        materialName: (sm.material as any).name,
        quantity: qty,
        unitCost: wac,
        totalCost: qty * wac,
      };
    });
  }
}
