import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { MaterialTypesService } from './material-types.service';
import { CreateMaterialTypeDto } from './dto/create-material-type.dto';
import { UpdateMaterialTypeDto } from './dto/update-material-type.dto';

@Controller('material-types')
export class MaterialTypesController {
  constructor(private readonly materialTypesService: MaterialTypesService) {}

  @Post()
  create(@Body() dto: CreateMaterialTypeDto) {
    return this.materialTypesService.create(dto);
  }

  @Get()
  findAll(
    @Query('parentId') parentId?: string,
    @Query('archived') archived?: string,
  ) {
    return this.materialTypesService.findAll({
      parentId: parentId === 'root' ? null : parentId || undefined,
      includeDeleted: archived === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialTypesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMaterialTypeDto) {
    return this.materialTypesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialTypesService.softDelete(id);
  }
}
