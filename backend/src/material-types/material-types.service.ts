import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialTypeDto } from './dto/create-material-type.dto';
import { UpdateMaterialTypeDto } from './dto/update-material-type.dto';

@Injectable()
export class MaterialTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialTypeDto) {
    return this.prisma.materialType.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll(options: { parentId?: string | null; includeDeleted?: boolean } = {}) {
    const where: any = {};
    if (options.includeDeleted !== true) where.deletedAt = null;
    if (options.parentId !== undefined) where.parentId = options.parentId;
    return this.prisma.materialType.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { materials: true } } },
    });
  }

  async findOne(id: string) {
    const type = await this.prisma.materialType.findFirst({
      where: { id, deletedAt: null },
      include: { parent: true, _count: { select: { materials: true } } },
    });
    if (!type) throw new NotFoundException('Тип материала не найден');
    return type;
  }

  async update(id: string, dto: UpdateMaterialTypeDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.materialType.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.materialType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
