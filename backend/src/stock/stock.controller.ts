import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { CreateWriteOffDto } from './dto/create-write-off.dto';
import { UpdateWriteOffDto } from './dto/update-write-off.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

@Controller('api/stock')
@UseGuards(OptionalJwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('entries')
  createEntry(@Body() dto: CreateStockEntryDto, @Req() req: { user?: { id: string; email?: string } }) {
    return this.stockService.createEntry(dto, req.user?.id);
  }

  @Get('entries')
  getEntries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.stockService.getEntries({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      supplierId,
    });
  }

  @Get('entries/:id')
  getEntry(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockService.getEntryById(id);
  }

  @Patch('entries/:id')
  updateEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockEntryDto,
    @Req() req: { user?: { id: string; email?: string } },
  ) {
    return this.stockService.updateEntry(id, dto, req.user?.id);
  }

  @Delete('entries/:id')
  deleteEntry(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user?: { id: string; email?: string } }) {
    return this.stockService.deleteEntry(id, req.user?.id);
  }

  @Post('write-offs')
  createWriteOff(@Body() dto: CreateWriteOffDto, @Req() req: { user?: { id: string; email?: string } }) {
    return this.stockService.createWriteOff(dto, req.user?.id);
  }

  @Get('write-offs')
  getWriteOffs(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('materialId') materialId?: string,
  ) {
    return this.stockService.getWriteOffs({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      materialId,
    });
  }

  @Get('write-offs/:id')
  getWriteOff(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockService.getWriteOffById(id);
  }

  @Patch('write-offs/:id')
  updateWriteOff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWriteOffDto,
    @Req() req: { user?: { id: string; email?: string } },
  ) {
    return this.stockService.updateWriteOff(id, dto, req.user?.id);
  }

  @Delete('write-offs/:id')
  deleteWriteOff(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user?: { id: string; email?: string } }) {
    return this.stockService.deleteWriteOff(id, req.user?.id);
  }

  @Get('movements')
  getMovements(
    @Query('materialId') materialId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stockService.getMovements({
      materialId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }
}
